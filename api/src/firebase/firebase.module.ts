import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import * as admin from 'firebase-admin';

const FIREBASE_APP = 'FIREBASE_APP';

const firebaseProvider = {
  provide: FIREBASE_APP,
  useFactory: (): admin.app.App => {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Missing Firebase config: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY must be set',
      );
    }

    if (admin.apps.length > 0) {
      return admin.apps[0]!;
    }

    return admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  },
};

@Global()
@Module({
  providers: [firebaseProvider],
  exports: [FIREBASE_APP],
})
export class FirebaseModule implements OnApplicationShutdown {
  async onApplicationShutdown() {
    await Promise.all(admin.apps.map((app) => app?.delete()));
  }
}

export { FIREBASE_APP };
