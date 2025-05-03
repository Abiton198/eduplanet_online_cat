const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json"); // Make sure this path is correct

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function makeAdmin(email) {
  const adminRef = db.collection("admins").doc(email);
  await adminRef.set({ admin: true });
  console.log(`✅ ${email} is now an admin`);
}

makeAdmin("nextgenskills96@gmail.com").catch(console.error);
