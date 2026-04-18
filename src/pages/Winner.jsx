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
import {
  sendDrawAnnouncementWhatsAppMessage,
  sendWinnerWhatsAppMessage,
} from "../services/whatsappService";

const Winner = () => {
  const today = new Date().toISOString().slice(0, 10);
  const [drawDate, setDrawDate] = useState(today);
  const [eligibleCustomers, setEligibleCustomers] = useState([]);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPicking, setIsPicking] = useState(false);
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
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
      const winnerWithDate = { ...winner, drawDate };
      setSelectedWinner(winnerWithDate);
      setEligibleCustomers((currentCustomers) =>
        currentCustomers.filter((customer) => customer.id !== winner.id)
      );

      try {
        await sendWinnerWhatsAppMessage(winnerWithDate);
      } catch (messageError) {
        setError(
          `Winner selected, but WhatsApp auto-send failed: ${messageError.message}`
        );
      }
    } catch (pickError) {
      setError(pickError.message || "Unable to pick winner right now.");
    } finally {
      setIsPicking(false);
    }
  };

  const handleNotifyWinner = async () => {
    if (!selectedWinner) {
      return;
    }

    setError("");

    try {
      await sendWinnerWhatsAppMessage(selectedWinner);
    } catch (messageError) {
      setError(messageError.message || "Unable to send winner notification.");
    }
  };

  const handleNotifyNonWinners = async () => {
    if (!selectedWinner || eligibleCustomers.length === 0) {
      return;
    }

    setIsSendingAnnouncement(true);
    setError("");

    const results = await Promise.allSettled(
      eligibleCustomers.map((customer) =>
        sendDrawAnnouncementWhatsAppMessage(customer, selectedWinner)
      )
    );

    const failedMessages = results.filter(
      (result) => result.status === "rejected"
    );

    if (failedMessages.length) {
      setError(
        `${eligibleCustomers.length - failedMessages.length} announcement message(s) sent, ${failedMessages.length} failed.`
      );
    }

    setIsSendingAnnouncement(false);
  };

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Lucky Draw"
        title="Pick one winner automatically from all qualified customers."
        description="The selected winner is drawn from all active coupons, so bigger purchases create more chances without allowing repeat winners."
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
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button className="btn-primary" onClick={handleNotifyWinner}>
                      Notify Winner On WhatsApp
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={handleNotifyNonWinners}
                      disabled={isSendingAnnouncement || eligibleCustomers.length === 0}
                    >
                      {isSendingAnnouncement
                        ? "Sending Other Updates..."
                        : "Notify Other Participants"}
                    </button>
                  </div>
                }
              />
            </div>
          )}
        </article>

        <article className="panel-card p-6">
          <SectionHeader
            title="Eligible Customers"
            description="Customers with active coupons available for the draw."
          />

          <div className="mt-6 space-y-3">
            {!isLoading && eligibleCustomers.length === 0 ? (
              <EmptyStateCard message="No eligible customers are available right now." />
            ) : (
              eligibleCustomers.map((customer) => (
                <CustomerEntryCard
                  key={customer.id}
                  customer={customer}
                  badgeLabel={`${customer.couponCount || 0} Coupons`}
                  meta={
                    <>
                      <p>Amount: Rs. {customer.purchaseAmount}</p>
                      <p>Coupon Chances: {customer.couponCount || 0}</p>
                    </>
                  }
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
