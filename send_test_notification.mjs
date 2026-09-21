import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAohSNLyeS6bYtnk2QvB4HGo0LbHDw9b6Q",
  authDomain: "spiritual-homeopathy-3b552.firebaseapp.com",
  databaseURL: "https://spiritual-homeopathy-3b552-default-rtdb.firebaseio.com",
  projectId: "spiritual-homeopathy-3b552",
  storageBucket: "spiritual-homeopathy-3b552.firebasestorage.app",
  messagingSenderId: "81822616559",
  appId: "1:81822616559:web:98a0b9cd974938cc87841a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function sendTest() {
  console.log('--- Sending Test Booking Notification for Dilshuknagar Branch ---');
  try {
    const notiDoc = {
      type: 'booking',
      title: 'Appointment Booked (TEST)',
      body: 'Test appointment booked for Test Patient at 11:00 AM (Dilshuknagar Branch)',
      patientName: 'Test Patient (Dilshuknagar)',
      appointmentTime: '11:00 AM',
      appointmentDate: '20-09-2026',
      branch: 'Dilshuknagar Branch',
      targetBranch: 'dilshuknagar',
      doctorName: 'Dr. Ramakrishna Chanduri',
      consultationMode: 'In-Clinic',
      targetRoles: ['reception', 'hr', 'admin'],
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    const ref = await addDoc(collection(db, 'notifications'), notiDoc);
    console.log('Successfully created test notification with ID:', ref.id);
  } catch (err) {
    console.error('Error creating test notification:', err);
  }
}

sendTest();
