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
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";
import { deleteStoreImage, uploadStoreImage } from "./imageUpload";

const CUSTOMERS_COLLECTION = "customers";
const COUPONS_COLLECTION = "coupons";
const WINNERS_COLLECTION = "winners";
const SETTINGS_COLLECTION = "settings";
const DRAW_SETTINGS_DOCUMENT = "drawControl";
const MIN_PURCHASE_AMOUNT = 2400;

const getCouponCount = (purchaseAmount) =>
  Math.floor(Number(purchaseAmount) / MIN_PURCHASE_AMOUNT);

const createCouponNumber = (couponId) => `PRYS-${couponId.slice(0, 6).toUpperCase()}`;

const mapSnapshotDocs = (snapshot) =>
  snapshot.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  }));

const getDrawSettingsRef = () =>
  doc(db, SETTINGS_COLLECTION, DRAW_SETTINGS_DOCUMENT);

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
  const { storeImageFile, ...customerPayload } = payload;
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
  const storeImageData = storeImageFile
    ? await uploadStoreImage(customerRef.id, storeImageFile)
    : {};

  batch.set(customerRef, {
    ...customerPayload,
    ...storeImageData,
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
      customerName: customerPayload.customerName,
      phoneNumber: customerPayload.phoneNumber,
      shopName: customerPayload.shopName,
      purchaseAmount,
      drawDate: customerPayload.drawDate,
      storeImageUrl: storeImageData.storeImageUrl || null,
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
    ...storeImageData,
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
  const { storeImageFile, ...customerPayload } = payload;
  const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
  const customerSnapshot = await getDoc(customerRef);

  if (!customerSnapshot.exists()) {
    throw new Error("Customer entry no longer exists.");
  }

  const customerData = customerSnapshot.data();

  if (customerData.winner) {
    throw new Error("Winner entries cannot be edited.");
  }

  const purchaseAmount = Number(customerPayload.purchaseAmount);
  const couponCount = getCouponCount(purchaseAmount);

  if (couponCount < 1) {
    throw new Error("Minimum purchase amount should be Rs. 2400.");
  }

  const existingCoupons = await fetchCustomerCoupons(customerId);
  const batch = writeBatch(db);
  let storeImageData = {};

  if (storeImageFile) {
    storeImageData = await uploadStoreImage(customerId, storeImageFile);

    if (customerData.storeImagePath) {
      await deleteStoreImage(customerData.storeImagePath);
    }
  }

  existingCoupons.forEach((coupon) => {
    batch.delete(doc(db, COUPONS_COLLECTION, coupon.id));
  });

  const couponRefs = Array.from({ length: couponCount }, () =>
    doc(collection(db, COUPONS_COLLECTION))
  );
  const couponNumbers = couponRefs.map((couponRef) => createCouponNumber(couponRef.id));

  batch.update(customerRef, {
    ...customerPayload,
    ...storeImageData,
    purchaseAmount,
    couponCount,
    couponNumbers,
    updatedAt: serverTimestamp(),
  });

  couponRefs.forEach((couponRef, index) => {
    batch.set(couponRef, {
      customerId,
      customerName: customerPayload.customerName,
      phoneNumber: customerPayload.phoneNumber,
      shopName: customerPayload.shopName,
      purchaseAmount,
      drawDate: customerPayload.drawDate,
      storeImageUrl: storeImageData.storeImageUrl || customerData.storeImageUrl || null,
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
    ...storeImageData,
  };
}

export async function deleteCustomerEntry(customerId) {
  const customerSnapshot = await getDoc(doc(db, CUSTOMERS_COLLECTION, customerId));
  const coupons = await fetchCustomerCoupons(customerId);
  const batch = writeBatch(db);

  coupons.forEach((coupon) => {
    batch.delete(doc(db, COUPONS_COLLECTION, coupon.id));
  });
  batch.delete(doc(db, CUSTOMERS_COLLECTION, customerId));

  await batch.commit();

  if (customerSnapshot.exists()) {
    await deleteStoreImage(customerSnapshot.data().storeImagePath);
  }
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

export async function fetchPresetWinner() {
  const settingsSnapshot = await getDoc(getDrawSettingsRef());

  if (!settingsSnapshot.exists()) {
    return null;
  }

  const settings = settingsSnapshot.data();
  const presetCustomerId = settings.presetCustomerId;

  if (!presetCustomerId) {
    return null;
  }

  const customerSnapshot = await getDoc(doc(db, CUSTOMERS_COLLECTION, presetCustomerId));

  if (!customerSnapshot.exists()) {
    return null;
  }

  return {
    id: customerSnapshot.id,
    ...customerSnapshot.data(),
  };
}

export async function setPresetWinner(customer) {
  await setDoc(
    getDrawSettingsRef(),
    {
      presetCustomerId: customer.id,
      presetCustomerName: customer.customerName,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function clearPresetWinner() {
  await setDoc(
    getDrawSettingsRef(),
    {
      presetCustomerId: null,
      presetCustomerName: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
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

  const settingsSnapshot = await getDoc(getDrawSettingsRef());
  const presetCustomerId = settingsSnapshot.exists()
    ? settingsSnapshot.data().presetCustomerId
    : null;
  const presetCustomerCoupons = presetCustomerId
    ? eligibleCoupons.filter((coupon) => coupon.customerId === presetCustomerId)
    : [];

  if (presetCustomerId && !presetCustomerCoupons.length) {
    await clearPresetWinner();
    throw new Error("The preset winner is no longer eligible for the draw.");
  }

  const couponPool = presetCustomerCoupons.length
    ? presetCustomerCoupons
    : eligibleCoupons;
  const selectedCoupon =
    couponPool[Math.floor(Math.random() * couponPool.length)];
  const customerRef = doc(db, CUSTOMERS_COLLECTION, selectedCoupon.customerId);
  const relatedCoupons = eligibleCoupons.filter(
    (coupon) => coupon.customerId === selectedCoupon.customerId
  );
  const winnerRef = doc(collection(db, WINNERS_COLLECTION));
  const drawSettingsRef = getDrawSettingsRef();
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

  batch.set(
    drawSettingsRef,
    {
      presetCustomerId: null,
      presetCustomerName: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();

  return {
    ...selectedCoupon,
    drawDate,
    couponCount: relatedCoupons.length,
  };
}
