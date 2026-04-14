import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import CustomerEntryCard from "../components/CustomerEntryCard";
import EmptyStateCard from "../components/EmptyStateCard";
import MetricCard from "../components/MetricCard";
import PageHero from "../components/PageHero";
import SectionHeader from "../components/SectionHeader";
import { auth } from "../firebase/config";
import {
  deleteCustomerEntry,
  fetchDashboardSnapshot,
  markWhatsAppSent,
} from "../firebase/luckyDrawService";

const metricCards = [
  {
    key: "totalCustomers",
    label: "Total Entries",
    helper: "All customer coupons stored",
  },
  {
    key: "qualifiedCustomers",
    label: "Eligible For Draw",
    helper: "Purchase amount is Rs. 2400 or more",
  },
  {
    key: "totalWinners",
    label: "Winners Declared",
    helper: "Customers already picked",
  },
];

const formatDate = (value) => {
  if (!value) {
    return "Just now";
  }

  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const buildWhatsAppMessage = ({ customerName, couponNumber, drawDate }) =>
  `Hello ${customerName},

Thank you for shopping with Pry's.
Your lucky draw coupon number is ${couponNumber}.
Draw Date: ${drawDate}

Please keep this coupon safe for the announcement.`;

const Dashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    customers: [],
    winners: [],
    metrics: {
      totalCustomers: 0,
      qualifiedCustomers: 0,
      totalWinners: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setIsLoading(true);
    setError("");

    try {
      const snapshot = await fetchDashboardSnapshot();
      setDashboardData(snapshot);
    } catch {
      setError("Unable to load dashboard data from Firebase.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/admin-login", { replace: true });
  };

  const handleEditCustomer = (customer) => {
    navigate("/add-customer", {
      state: {
        mode: "edit",
        customer,
      },
    });
  };

  const handleDeleteCustomer = async (customer) => {
    const shouldDelete = window.confirm(
      `Delete customer entry for ${customer.customerName}?`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await deleteCustomerEntry(customer.id);
      await loadDashboard();
    } catch {
      setError("Unable to delete the customer entry right now.");
    }
  };

  const handleSendWhatsApp = async (customer) => {
    const message = buildWhatsAppMessage(customer);
    const url = `https://wa.me/91${customer.phoneNumber}?text=${encodeURIComponent(
      message
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");

    try {
      await markWhatsAppSent(customer.id);
      await loadDashboard();
    } catch {
      setError("WhatsApp opened, but the sent status could not be updated.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Campaign Overview"
        title="Track coupon issuance, customer eligibility, and draw progress in real time."
        description="Use the entry form to add purchase details, then jump to winner selection when the campaign is ready."
        sideTitle="Admin Checklist"
        sideContent={
          <ul className="space-y-3 text-sm leading-6 text-[var(--text)]">
            <li>1. Add eligible customers with a valid phone number.</li>
            <li>2. Review the latest entries before running the draw.</li>
            <li>3. Share coupon and draw date through WhatsApp.</li>
            <li>4. Pick one winner only when entries are finalized.</li>
          </ul>
        }
        actions={
          <>
            <Link className="btn-primary" to="/add-customer">
              Add New Entry
            </Link>
            <Link className="btn-secondary" to="/pickwinner">
              Run Lucky Draw
            </Link>
            <button className="btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </>
        }
      />

      {error && <div className="status-error">{error}</div>}

      <section className="grid gap-4 md:grid-cols-3">
        {metricCards.map((metric) => (
          <MetricCard
            key={metric.key}
            label={metric.label}
            value={isLoading ? "--" : dashboardData.metrics[metric.key]}
            helper={metric.helper}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="panel-card p-6">
          <SectionHeader
            title="Recent Customer Entries"
            description="Latest coupon records saved to Firestore"
            action={
              <Link className="btn-secondary" to="/add-customer">
                Add More
              </Link>
            }
          />

          <div className="mt-5 space-y-3">
            {dashboardData.customers.length === 0 && !isLoading ? (
              <EmptyStateCard message="No customer entries yet." />
            ) : (
              dashboardData.customers.map((customer) => (
                <CustomerEntryCard
                  key={customer.id}
                  customer={customer}
                  menuActions={[
                    {
                      label: "Edit Entry",
                      icon: "edit",
                      onClick: handleEditCustomer,
                    },
                    {
                      label: customer.whatsappSent
                        ? "Resend WhatsApp"
                        : "Send WhatsApp",
                      icon: "whatsapp",
                      onClick: handleSendWhatsApp,
                    },
                    ...(customer.whatsappSent
                      ? [
                          {
                            label: "Marked as Sent",
                            icon: "sent",
                            onClick: () => {},
                          },
                        ]
                      : []),
                    {
                      label: "Delete Entry",
                      icon: "delete",
                      variant: "danger",
                      onClick: handleDeleteCustomer,
                    },
                  ]}
                  meta={
                    <>
                    <span>Rs. {Number(customer.purchaseAmount || 0)}</span>
                    <span>{formatDate(customer.createdAt)}</span>
                    <span>{customer.winner ? "Winner Declared" : "Pending"}</span>
                    </>
                  }
                />
              ))
            )}
          </div>
        </article>

        <article className="panel-card p-6">
          <SectionHeader
            title="Recent Winners"
            description="Most recent lucky draw outcomes"
          />

          <div className="mt-5 space-y-3">
            {dashboardData.winners.length === 0 && !isLoading ? (
              <EmptyStateCard message="No winners have been selected yet." />
            ) : (
              dashboardData.winners.map((winner) => (
                <CustomerEntryCard
                  key={winner.id}
                  customer={winner}
                  meta={<p>Draw Date: {winner.drawDate || "Not set"}</p>}
                />
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
};

export default Dashboard;
