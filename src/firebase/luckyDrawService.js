import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";

const CUSTOMERS_COLLECTION = "customers";
const COUPONS_COLLECTION = "coupons";
const WINNERS_COLLECTION = "winners";
const MIN_PURCHASE_AMOUNT = 2400;

const getCouponCount = (purchaseAmount) =>
  Math.floor(Number(purchaseAmount) / MIN_PURCHASE_AMOUNT);

const createCouponNumber = (couponId) => `PRYS-${couponId.slice(0, 6).toUpperCase()}`;

const mapSnapshotDocs = (snapshot) =>
  snapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  }));

async function fetchCustomerCoupons(customerId) {
  const couponsSnapshot = await getDocs(
    query(
      collection(db, COUPONS_COLLECTION),
      where("customerId", "==", customerId)
    )
  );

  return mapSnapshotDocs(couponsSnapshot);
}

export async function createCustomerEntry(payload) {
  const purchaseAmount = Number(payload.purchaseAmount);
  const couponCount = getCouponCount(purchaseAmount);

  if (couponCount < 1) {
    throw new Error("Minimum purchase amount should be Rs. 2400.");
  }

  const customerRef = doc(collection(db, CUSTOMERS_COLLECTION));
  const couponRefs = Array.from({ length: couponCount }, () =>
    doc(collection(db, COUPONS_COLLECTION))
  );
  const couponNumbers = couponRefs.map((couponRef) => createCouponNumber(couponRef.id));
  const batch = writeBatch(db);

  batch.set(customerRef, {
    ...payload,
    purchaseAmount,
    couponCount,
    couponNumbers,
    winner: false,
    whatsappSent: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  couponRefs.forEach((couponRef, index) => {
    batch.set(couponRef, {
      customerId: customerRef.id,
      customerName: payload.customerName,
      phoneNumber: payload.phoneNumber,
      shopName: payload.shopName,
      purchaseAmount,
      drawDate: payload.drawDate,
      couponNumber: couponNumbers[index],
      couponIndex: index + 1,
      active: true,
      winner: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();

  return {
    id: customerRef.id,
    couponCount,
    couponNumbers,
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
  const customerSnapshot = await getDoc(customerRef);

  if (!customerSnapshot.exists()) {
    throw new Error("Customer entry no longer exists.");
  }

  const customerData = customerSnapshot.data();

  if (customerData.winner) {
    throw new Error("Winner entries cannot be edited.");
  }

  const purchaseAmount = Number(payload.purchaseAmount);
  const couponCount = getCouponCount(purchaseAmount);

  if (couponCount < 1) {
    throw new Error("Minimum purchase amount should be Rs. 2400.");
  }

  const existingCoupons = await fetchCustomerCoupons(customerId);
  const batch = writeBatch(db);

  existingCoupons.forEach((coupon) => {
    batch.delete(doc(db, COUPONS_COLLECTION, coupon.id));
  });

  const couponRefs = Array.from({ length: couponCount }, () =>
    doc(collection(db, COUPONS_COLLECTION))
  );
  const couponNumbers = couponRefs.map((couponRef) => createCouponNumber(couponRef.id));

  batch.update(customerRef, {
    ...payload,
    purchaseAmount,
    couponCount,
    couponNumbers,
    updatedAt: serverTimestamp(),
  });

  couponRefs.forEach((couponRef, index) => {
    batch.set(couponRef, {
      customerId,
      customerName: payload.customerName,
      phoneNumber: payload.phoneNumber,
      shopName: payload.shopName,
      purchaseAmount,
      drawDate: payload.drawDate,
      couponNumber: couponNumbers[index],
      couponIndex: index + 1,
      active: true,
      winner: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();

  return {
    id: customerId,
    couponCount,
    couponNumbers,
  };
}

export async function deleteCustomerEntry(customerId) {
  const coupons = await fetchCustomerCoupons(customerId);
  const batch = writeBatch(db);

  coupons.forEach((coupon) => {
    batch.delete(doc(db, COUPONS_COLLECTION, coupon.id));
  });
  batch.delete(doc(db, CUSTOMERS_COLLECTION, customerId));

  await batch.commit();
}

export async function fetchDashboardSnapshot() {
  const customersQuery = query(
    collection(db, CUSTOMERS_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(8)
  );
  const winnersQuery = query(
    collection(db, WINNERS_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(5)
  );

  const [
    customersSnapshot,
    winnersSnapshot,
    totalCustomers,
    totalWinners,
    totalCoupons,
    qualifiedCustomersSnapshot,
  ] = await Promise.all([
    getDocs(customersQuery),
    getDocs(winnersQuery),
    getCountFromServer(collection(db, CUSTOMERS_COLLECTION)),
    getCountFromServer(collection(db, WINNERS_COLLECTION)),
    getCountFromServer(collection(db, COUPONS_COLLECTION)),
    getDocs(
      query(
        collection(db, CUSTOMERS_COLLECTION),
        where("winner", "==", false)
      )
    ),
  ]);

  const customers = mapSnapshotDocs(customersSnapshot);
  const winners = mapSnapshotDocs(winnersSnapshot);
  const qualifiedCustomers = qualifiedCustomersSnapshot.docs.filter(
    (entry) => Number(entry.data().purchaseAmount) >= MIN_PURCHASE_AMOUNT
  ).length;

  return {
    customers,
    winners,
    metrics: {
      totalCustomers: totalCustomers.data().count,
      totalWinners: totalWinners.data().count,
      totalCoupons: totalCoupons.data().count,
      qualifiedCustomers,
    },
  };
}

export async function fetchEligibleCustomers() {
  const snapshot = await getDocs(
    query(collection(db, CUSTOMERS_COLLECTION), orderBy("createdAt", "desc"))
  );

  return mapSnapshotDocs(snapshot).filter(
    (customer) => Number(customer.purchaseAmount) >= MIN_PURCHASE_AMOUNT && customer.winner !== true
  );
}

export async function pickLuckyDrawWinner(drawDate) {
  const eligibleCouponsSnapshot = await getDocs(
    query(
      collection(db, COUPONS_COLLECTION),
      where("active", "==", true),
      where("winner", "==", false)
    )
  );

  const eligibleCoupons = mapSnapshotDocs(eligibleCouponsSnapshot);

  if (!eligibleCoupons.length) {
    throw new Error("No eligible coupons are available for the draw.");
  }

  const selectedCoupon =
    eligibleCoupons[Math.floor(Math.random() * eligibleCoupons.length)];
  const customerRef = doc(db, CUSTOMERS_COLLECTION, selectedCoupon.customerId);
  const relatedCoupons = eligibleCoupons.filter(
    (coupon) => coupon.customerId === selectedCoupon.customerId
  );
  const winnerRef = doc(collection(db, WINNERS_COLLECTION));
  const batch = writeBatch(db);

  batch.set(winnerRef, {
    customerId: selectedCoupon.customerId,
    customerName: selectedCoupon.customerName,
    phoneNumber: selectedCoupon.phoneNumber,
    couponNumber: selectedCoupon.couponNumber,
    couponCount: relatedCoupons.length,
    shopName: selectedCoupon.shopName,
    purchaseAmount: Number(selectedCoupon.purchaseAmount),
    drawDate,
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, COUPONS_COLLECTION, selectedCoupon.id), {
    winner: true,
    active: false,
    drawDate,
    updatedAt: serverTimestamp(),
  });

  relatedCoupons
    .filter((coupon) => coupon.id !== selectedCoupon.id)
    .forEach((coupon) => {
      batch.update(doc(db, COUPONS_COLLECTION, coupon.id), {
        active: false,
        updatedAt: serverTimestamp(),
      });
    });

  batch.update(customerRef, {
    winner: true,
    winnerDeclaredAt: serverTimestamp(),
    winningCouponNumber: selectedCoupon.couponNumber,
    drawDate,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  return {
    ...selectedCoupon,
    drawDate,
    couponCount: relatedCoupons.length,
  };
}
