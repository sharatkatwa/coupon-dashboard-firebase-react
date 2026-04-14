import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, LockKeyhole, Search, Trash2 } from "lucide-react";
import CustomerEntryCard from "../components/CustomerEntryCard";
import EmptyStateCard from "../components/EmptyStateCard";
import PageHero from "../components/PageHero";
import SectionHeader from "../components/SectionHeader";
import {
  clearPresetWinner,
  fetchEligibleCustomers,
  fetchPresetWinner,
  setPresetWinner,
} from "../firebase/luckyDrawService";

const PresetWinner = () => {
  const [eligibleCustomers, setEligibleCustomers] = useState([]);
  const [presetWinner, setPresetWinnerState] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setError("");

    try {
      const [customers, preset] = await Promise.all([
        fetchEligibleCustomers(),
        fetchPresetWinner(),
      ]);
      setEligibleCustomers(customers);
      setPresetWinnerState(preset);
    } catch {
      setError("Unable to load preset winner settings right now.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    if (!normalizedQuery) {
      return eligibleCustomers;
    }

    return eligibleCustomers.filter((customer) =>
      [customer.customerName, customer.phoneNumber, customer.shopName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [eligibleCustomers, searchTerm]);

  const handleSetPreset = async (customer) => {
    setIsSaving(true);
    setError("");

    try {
      await setPresetWinner(customer);
      await loadData();
    } catch {
      setError("Unable to save the preset winner.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearPreset = async () => {
    setIsSaving(true);
    setError("");

    try {
      await clearPresetWinner();
      await loadData();
    } catch {
      setError("Unable to clear the preset winner.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Hidden Draw Control"
        title="Preset the next lucky draw winner without exposing the route in the main navigation."
        description="This page is protected by admin authentication and intentionally hidden from the visible sidebar. The next normal draw will use this customer if they are still eligible."
        sideTitle="How It Works"
        sideContent={
          <ul className="space-y-3 text-sm leading-6">
            <li>1. Choose an eligible customer below.</li>
            <li>2. Save them as the preset winner.</li>
            <li>3. Run the usual draw from the main winner screen.</li>
            <li>4. The preset is cleared automatically after use.</li>
          </ul>
        }
      />

      {error && <div className="status-error">{error}</div>}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="panel-card p-6">
          <SectionHeader
            title="Current Preset"
            description="This customer will win the next draw if still eligible."
          />

          {!presetWinner ? (
            <div className="mt-6">
              <EmptyStateCard message="No preset winner is configured right now." />
            </div>
          ) : (
            <div className="mt-6 rounded-[28px] border border-emerald-200 bg-emerald-50/90 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.28em] text-emerald-700">
                    Locked In
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-emerald-950">
                    {presetWinner.customerName}
                  </h3>
                </div>
                <LockKeyhole className="text-emerald-700" size={22} />
              </div>
              <div className="mt-4 space-y-2 text-sm text-emerald-950/85">
                <p>Phone: {presetWinner.phoneNumber}</p>
                <p>Shop: {presetWinner.shopName}</p>
                <p>Coupon Chances: {presetWinner.couponCount || 0}</p>
                <p>Draw Date: {presetWinner.drawDate}</p>
              </div>
              <button
                type="button"
                onClick={handleClearPreset}
                disabled={isSaving}
                className="btn-secondary mt-5"
              >
                <Trash2 size={16} />
                Clear Preset
              </button>
            </div>
          )}
        </article>

        <article className="panel-card p-6">
          <SectionHeader
            title="Eligible Customers"
            description="Pick one customer to force as the next winner."
          />

          <label className="mt-6 flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3">
            <Search size={16} className="text-[var(--muted)]" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, phone, or shop"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>

          <div className="mt-5 space-y-3">
            {!isLoading && filteredCustomers.length === 0 ? (
              <EmptyStateCard message="No matching eligible customers found." />
            ) : (
              filteredCustomers.map((customer) => (
                <div key={customer.id} className="space-y-3">
                  <CustomerEntryCard
                    customer={customer}
                    badgeLabel={`${customer.couponCount || 0} Coupons`}
                    meta={
                      <>
                        <span>Rs. {Number(customer.purchaseAmount || 0)}</span>
                        <span>{customer.couponCount || 0} coupon chances</span>
                      </>
                    }
                  />
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSetPreset(customer)}
                    className="btn-primary"
                  >
                    <CheckCircle2 size={16} />
                    Set As Preset Winner
                  </button>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
};

export default PresetWinner;
