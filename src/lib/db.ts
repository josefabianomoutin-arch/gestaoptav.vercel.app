
import { 
  getDatabase as fbGetDatabase, 
  ref as fbRef, 
  onValue as fbOnValue, 
  set as fbSet, 
  runTransaction as fbRunTransaction, 
  push as fbPush, 
  child as fbChild, 
  update as fbUpdate, 
  remove as fbRemove, 
  get as fbGet,
  DatabaseReference
} from 'firebase/database';
import { app } from '../firebaseConfig';
import { localDatabase } from './databaseProxy';
import { sanitizeForFirebase } from './utils';

export const getDatabase = () => fbGetDatabase(app);

export const ref = (db: any, path?: string) => fbRef(db, path);

export const child = (parent: any, path: string) => fbChild(parent, path);

const getPath = (dbRef: any): string => {
  if (!dbRef) return '';
  if (typeof dbRef === 'string') return dbRef.startsWith('/') ? dbRef : `/${dbRef}`;

  // 1. dbRef.toString() é o método canônico do Firebase SDK em todas as versões
  if (typeof dbRef.toString === 'function') {
    try {
      const urlStr = dbRef.toString();
      if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
        const url = new URL(urlStr);
        if (url.pathname) {
          return decodeURIComponent(url.pathname);
        }
      }
    } catch (err) {
      void err;
    }
  }

  // 2. Propriedade interna _path
  if (dbRef._path) {
    if (typeof dbRef._path.toString === 'function') {
      const p = dbRef._path.toString();
      if (p) return p.startsWith('/') ? p : `/${p}`;
    }
    if (Array.isArray(dbRef._path.pieces_)) {
      return '/' + dbRef._path.pieces_.join('/');
    }
  }

  // 3. Fallback pela chave se não houver caminho completo
  if (dbRef.key) return `/${dbRef.key}`;
  return '';
};

export const get = async (dbRef: DatabaseReference) => {
  const path = getPath(dbRef);
  try {
    const localRes = await localDatabase.get(path);
    if (localRes && localRes.exists && localRes.exists()) {
      return localRes;
    }
  } catch (err) {
    console.warn("[DB Proxy] get error:", err);
  }
  return fbGet(dbRef);
};

export const set = async (dbRef: DatabaseReference, data: any) => {
  const path = getPath(dbRef);
  let localResult = null;
  const cleanData = sanitizeForFirebase(data);
  try {
    localResult = await localDatabase.set(path, cleanData);
  } catch (err) {
    console.warn("[DB Proxy] set error:", err);
  }

  try {
    fbSet(dbRef, cleanData).catch((err) => {
      console.warn("[Firebase sync warning]:", err);
    });
  } catch (err) {
    void err;
  }

  return localResult || { success: true };
};

export const update = async (dbRef: DatabaseReference, data: any) => {
  const path = getPath(dbRef);
  let localResult = null;
  const cleanData = sanitizeForFirebase(data);
  try {
    localResult = await localDatabase.update(path, cleanData);
  } catch (err) {
    console.warn("[DB Proxy] update error:", err);
  }

  try {
    fbUpdate(dbRef, cleanData).catch((err) => {
      console.warn("[Firebase update warning]:", err);
    });
  } catch (err) {
    void err;
  }

  return localResult || { success: true };
};

export const remove = async (dbRef: DatabaseReference) => {
  const path = getPath(dbRef);
  try {
    await localDatabase.remove(path);
  } catch (err) {
    console.warn("[DB Proxy] remove error:", err);
  }

  try {
    fbRemove(dbRef).catch(() => {});
  } catch (err) {
    void err;
  }

  return { success: true };
};

export const push = (dbRef: DatabaseReference, data?: any) => {
  const path = getPath(dbRef);
  const fakeRef = fbPush(dbRef, data);
  if (data !== undefined) {
    const cleanData = sanitizeForFirebase(data);
    localDatabase.push(path, cleanData).catch((e) => console.warn("[DB Proxy] push error:", e));
  }
  return fakeRef;
};

export const onValue = (dbRef: DatabaseReference, callback: (snapshot: any) => void) => {
  const path = getPath(dbRef);
  let lastJson = '';

  const dispatch = (snap: any) => {
    if (!snap) return;
    try {
      const val = snap.val ? snap.val() : snap;
      const jsonStr = JSON.stringify(val);
      if (jsonStr !== lastJson) {
        lastJson = jsonStr;
        callback(snap);
      }
    } catch {
      callback(snap);
    }
  };

  // 1. Carrega imediatamente do servidor local (resposta instantânea em ~5ms)
  localDatabase.get(path).then((snap) => {
    if (snap && snap.exists && snap.exists()) {
      dispatch(snap);
    }
  }).catch(() => {});

  // 2. Conecta ao Firebase se disponível
  let unsubFb: any = () => {};
  try {
    unsubFb = fbOnValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        dispatch(snapshot);
      }
    }, (err) => {
      console.warn("[Firebase onValue error, mantendo dados do servidor]:", err);
    });
  } catch (err) {
    void err;
  }

  // 3. Polling suave no banco local para sincronia entre abas e usuários
  const interval = setInterval(() => {
    localDatabase.get(path).then((snap) => {
      if (snap && snap.exists && snap.exists()) {
        dispatch(snap);
      }
    }).catch(() => {});
  }, 4000);

  return () => {
    clearInterval(interval);
    if (typeof unsubFb === 'function') unsubFb();
  };
};

export const runTransaction = async (dbRef: DatabaseReference, transactionUpdate: (currentData: any) => any) => {
  const path = getPath(dbRef);
  try {
    const snap = await localDatabase.get(path);
    const currentVal = snap?.val ? snap.val() : null;
    const newData = transactionUpdate(currentVal);
    if (newData !== undefined) {
      const cleanData = sanitizeForFirebase(newData);
      await localDatabase.set(path, cleanData);
      try {
        fbSet(dbRef, cleanData).catch(() => {});
      } catch (err) {
        void err;
      }
      return { committed: true, snapshot: { val: () => cleanData } };
    }
  } catch (err) {
    console.warn("[DB Proxy] runTransaction error:", err);
  }
  return fbRunTransaction(dbRef, transactionUpdate);
};
