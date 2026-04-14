import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./config";

const CUSTOMERS_COLLECTION = "customers";
const WINNERS_COLLECTION = "winners";

export async function createCustomerEntry(payload) {
  const customerRef = doc(collection(db, CUSTOMERS_COLLECTION));
  const couponNumber = `PRYS-${customerRef.id.slice(0, 6).toUpperCase()}`;

  await runTransaction(db, async (transaction) => {
    transaction.set(customerRef, {
      ...payload,
      couponNumber,
      winner: false,
      whatsappSent: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  return {
    id: customerRef.id,
    couponNumber,
  };
}

export async function markWhatsAppSent(customerId) {
  const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
  await updateDoc(customerRef, {
    whatsappSent: true,
    updatedAt: serverTimestamp(),
  });
}

export async function updateCustomerEntry(customerId, payload) {
  const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
  await updateDoc(customerRef, {
    ...payload,
    purchaseAmount: Number(payload.purchaseAmount),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCustomerEntry(customerId) {
  const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
  await deleteDoc(customerRef);
}

export async function fetchDashboardSnapshot() {
  const customersQuery = query(
    collection(db, CUSTOMERS_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(8)
  );
  const allCustomersQuery = collection(db, CUSTOMERS_COLLECTION);
  const winnersQuery = query(
    collection(db, WINNERS_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(5)
  );

  const [
    customersSnapshot,
    allCustomersSnapshot,
    winnersSnapshot,
    totalCustomers,
    totalWinners,
  ] = await Promise.all([
    getDocs(customersQuery),
    getDocs(allCustomersQuery),
    getDocs(winnersQuery),
    getCountFromServer(collection(db, CUSTOMERS_COLLECTION)),
    getCountFromServer(collection(db, WINNERS_COLLECTION)),
  ]);

  const customers = customersSnapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  }));
  const allCustomers = allCustomersSnapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  }));
  const winners = winnersSnapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  }));
  const qualifiedCustomers = allCustomers.filter(
    (customer) =>
      Number(customer.purchaseAmount) >= 2400 && customer.winner !== true
  ).length;

  return {
    customers,
    winners,
    metrics: {
      totalCustomers: totalCustomers.data().count,
      totalWinners: totalWinners.data().count,
      qualifiedCustomers,
    },
  };
}

export async function fetchEligibleCustomers() {
  const snapshot = await getDocs(
    query(collection(db, CUSTOMERS_COLLECTION), orderBy("createdAt", "desc"))
  );

  return snapshot.docs
    .map((entry) => ({
      id: entry.id,
      ...entry.data(),
    }))
    .filter(
      (customer) =>
        Number(customer.purchaseAmount) >= 2400 && customer.winner !== true
    );
}

export async function pickLuckyDrawWinner(drawDate) {
  const eligibleCustomers = await fetchEligibleCustomers();

  if (!eligibleCustomers.length) {
    throw new Error("No eligible customers are available for the draw.");
  }

  const selectedCustomer =
    eligibleCustomers[Math.floor(Math.random() * eligibleCustomers.length)];

  const winnerRecord = {
    customerId: selectedCustomer.id,
    customerName: selectedCustomer.customerName,
    phoneNumber: selectedCustomer.phoneNumber,
    couponNumber: selectedCustomer.couponNumber,
    shopName: selectedCustomer.shopName,
    purchaseAmount: Number(selectedCustomer.purchaseAmount),
    drawDate,
    createdAt: serverTimestamp(),
  };

  await addDoc(collection(db, WINNERS_COLLECTION), winnerRecord);
  await updateDoc(doc(db, CUSTOMERS_COLLECTION, selectedCustomer.id), {
    winner: true,
    winnerDeclaredAt: serverTimestamp(),
    drawDate,
    updatedAt: serverTimestamp(),
  });

  return selectedCustomer;
}
