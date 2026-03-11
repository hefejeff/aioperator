import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const deleteAuthUser = onRequest(
  {
    cors: true,
    timeoutSeconds: 60,
    maxInstances: 10,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const authHeader = req.headers.authorization || '';
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!idToken) {
        res.status(401).json({ error: 'Missing authorization token' });
        return;
      }

      const decoded = await admin.auth().verifyIdToken(idToken);
      const adminUid = decoded.uid;

      const roleSnap = await admin.database().ref(`users/${adminUid}/role`).get();
      const role = roleSnap.val();
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
        res.status(403).json({ error: 'Not authorized' });
        return;
      }

      const targetUserId = String(req.body?.targetUserId || '').trim();
      if (!targetUserId) {
        res.status(400).json({ error: 'Missing targetUserId' });
        return;
      }

      if (targetUserId === adminUid) {
        res.status(400).json({ error: 'Cannot delete your own auth account from admin tool' });
        return;
      }

      try {
        await admin.auth().deleteUser(targetUserId);
      } catch (error: any) {
        if (error?.code !== 'auth/user-not-found') {
          throw error;
        }
      }

      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('deleteAuthUser failed:', error);
      res.status(500).json({
        error: error?.message || 'Internal server error',
      });
    }
  }
);
