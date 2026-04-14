const WinnerCard = ({ winner, action }) => {
  return (
    <div className="rounded-[28px] border border-amber-200 bg-amber-50/90 p-5">
      <p className="text-sm font-medium uppercase tracking-[0.28em] text-amber-700">
        Winner Declared
      </p>
      <h4 className="mt-3 text-3xl font-semibold text-amber-950">
        {winner.customerName}
      </h4>
      <div className="mt-4 space-y-2 text-sm text-amber-950/85">
        <p>Coupon: {winner.couponNumber}</p>
        <p>Total Coupons: {winner.couponCount}</p>
        <p>Phone: {winner.phoneNumber}</p>
        <p>Shop: {winner.shopName}</p>
        <p>Amount: Rs. {winner.purchaseAmount}</p>
        <p>Draw Date: {winner.drawDate}</p>
      </div>
      {action}
    </div>
  );
};

export default WinnerCard;
