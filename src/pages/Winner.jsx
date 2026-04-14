import { useEffect, useState } from "react";
import CustomerEntryCard from "../components/CustomerEntryCard";
import EmptyStateCard from "../components/EmptyStateCard";
import PageHero from "../components/PageHero";
import SectionHeader from "../components/SectionHeader";
import WinnerCard from "../components/WinnerCard";
import {
  fetchEligibleCustomers,
  pickLuckyDrawWinner,
} from "../firebase/luckyDrawService";

const buildWinnerMessage = ({ customerName, couponNumber, drawDate }) =>
  `Congratulations ${customerName}!

You are the lucky draw winner for Pry's.
Winning Coupon: ${couponNumber}
Draw Date: ${drawDate}

Our team will contact you with the prize details.`;

const Winner = () => {
  const today = new Date().toISOString().slice(0, 10);
  const [drawDate, setDrawDate] = useState(today);
  const [eligibleCustomers, setEligibleCustomers] = useState([]);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadEligibleCustomers = async () => {
      setIsLoading(true);
      setError("");

      try {
        const customers = await fetchEligibleCustomers();

        if (isMounted) {
          setEligibleCustomers(customers);
        }
      } catch {
        if (isMounted) {
          setError("Unable to load eligible customers.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadEligibleCustomers();

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePickWinner = async () => {
    setIsPicking(true);
    setError("");

    try {
      const winner = await pickLuckyDrawWinner(drawDate);
      setSelectedWinner({ ...winner, drawDate });
      setEligibleCustomers((currentCustomers) =>
        currentCustomers.filter((customer) => customer.id !== winner.id)
      );
    } catch (pickError) {
      setError(pickError.message || "Unable to pick winner right now.");
    } finally {
      setIsPicking(false);
    }
  };

  const handleNotifyWinner = () => {
    if (!selectedWinner) {
      return;
    }

    const message = buildWinnerMessage(selectedWinner);
    const url = `https://wa.me/91${selectedWinner.phoneNumber}?text=${encodeURIComponent(
      message
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Lucky Draw"
        title="Pick one winner automatically from all qualified customers."
        description="The selected winner is stored in Firestore and removed from the eligible list so the same coupon is not picked again."
        sideTitle="Draw Controls"
        sideContent={
          <>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Draw Date</span>
              <input
                type="date"
                value={drawDate}
                onChange={(event) => setDrawDate(event.target.value)}
                className="input-field"
              />
            </label>
            <button
              className="btn-primary mt-4"
              onClick={handlePickWinner}
              disabled={isLoading || isPicking || eligibleCustomers.length === 0}
            >
              {isPicking ? "Picking Winner..." : "Select Winner Automatically"}
            </button>
          </>
        }
      />

      {error && <div className="status-error">{error}</div>}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="panel-card p-6">
          <SectionHeader
            title="Current Winner"
            description="Run the draw to generate and store a winner."
          />

          {!selectedWinner ? (
            <div className="mt-6">
              <EmptyStateCard message="No winner selected in this session yet." />
            </div>
          ) : (
            <div className="mt-6">
              <WinnerCard
                winner={selectedWinner}
                action={
                  <button className="btn-primary mt-5" onClick={handleNotifyWinner}>
                    Notify Winner On WhatsApp
                  </button>
                }
              />
            </div>
          )}
        </article>

        <article className="panel-card p-6">
          <SectionHeader
            title="Eligible Customers"
            description="Customers with purchase amount of Rs. 2400 or more and no winner flag yet."
          />

          <div className="mt-6 space-y-3">
            {!isLoading && eligibleCustomers.length === 0 ? (
              <EmptyStateCard message="No eligible customers are available right now." />
            ) : (
              eligibleCustomers.map((customer) => (
                <CustomerEntryCard
                  key={customer.id}
                  customer={customer}
                  meta={<p>Amount: Rs. {customer.purchaseAmount}</p>}
                />
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
};

export default Winner;
