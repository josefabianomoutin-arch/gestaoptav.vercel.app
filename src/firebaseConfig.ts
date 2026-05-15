// Cole aqui a configuração do seu projeto Firebase.
// 1. Vá para a consola do Firebase: https://console.firebase.google.com/
// 2. Abra as Configurações do Projeto (ícone de engrenagem).
// 3. Na aba "Geral", role para baixo e encontre as configurações do seu app da Web.
// 4. Copie o objeto `firebaseConfig` e cole abaixo, substituindo este exemplo.

import { initializeApp, getApps } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import firebaseAppletConfig from '../firebase-applet-config.json';

export const firebaseConfig = {
  ...firebaseAppletConfig,
  databaseURL: `https://${firebaseAppletConfig.projectId}-default-rtdb.firebaseio.com`
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const storage = getStorage(app);

