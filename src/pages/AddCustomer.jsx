import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import EmptyStateCard from "../components/EmptyStateCard";
import PageHero from "../components/PageHero";
import SectionHeader from "../components/SectionHeader";
import { useLocation, useNavigate } from "react-router";
import {
  createCustomerEntry,
  markWhatsAppSent,
  updateCustomerEntry,
} from "../firebase/luckyDrawService";

const buildWhatsAppMessage = ({
  customerName,
  couponCount,
  couponNumbers,
  drawDate,
}) =>
  `Hello ${customerName},

Thank you for shopping with Pry's.
You have received ${couponCount} lucky draw coupon${couponCount > 1 ? "s" : ""}.
Coupon Code${couponCount > 1 ? "s" : ""}: ${couponNumbers.join(", ")}
Draw Date: ${drawDate}

Please keep this coupon safe for the announcement.`;

export default function AddCustomer() {
  const today = new Date().toISOString().slice(0, 10);
  const location = useLocation();
  const navigate = useNavigate();
  const editingCustomer = location.state?.customer || null;
  const isEditing = location.state?.mode === "edit" && Boolean(editingCustomer);
  const [generatedCoupon, setGeneratedCoupon] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      customerName: "",
      phoneNumber: "",
      purchaseAmount: "",
      shopName: "",
      drawDate: today,
    },
  });

  useEffect(() => {
    if (!isEditing) {
      reset({
        customerName: "",
        phoneNumber: "",
        purchaseAmount: "",
        shopName: "",
        drawDate: today,
      });
      return;
    }

    reset({
      customerName: editingCustomer.customerName || "",
      phoneNumber: editingCustomer.phoneNumber || "",
      purchaseAmount: editingCustomer.purchaseAmount || "",
      shopName: editingCustomer.shopName || "",
      drawDate: editingCustomer.drawDate || today,
    });
  }, [editingCustomer, isEditing, reset, today]);

  const onSubmit = async (data) => {
    setIsSaving(true);
    setSubmitError("");

    try {
      const purchaseAmount = Number(data.purchaseAmount);

      if (purchaseAmount < 2400) {
        throw new Error("Minimum purchase amount should be Rs. 2400.");
      }

      const payload = {
        customerName: data.customerName.trim(),
        phoneNumber: data.phoneNumber.trim(),
        purchaseAmount,
        shopName: data.shopName.trim(),
        drawDate: data.drawDate,
        storeImageFile: data.storeImage?.[0],
      };

      if (isEditing) {
        await updateCustomerEntry(editingCustomer.id, payload);
        navigate("/", { replace: true });
        return;
      }

      const createdEntry = await createCustomerEntry(payload);

      setGeneratedCoupon({
        ...payload,
        id: createdEntry.id,
        couponCount: createdEntry.couponCount,
        couponNumbers: createdEntry.couponNumbers,
        storeImageUrl: createdEntry.storeImageUrl || editingCustomer?.storeImageUrl || null,
      });

      reset({
        customerName: "",
        phoneNumber: "",
        purchaseAmount: "",
        shopName: "",
        drawDate: today,
      });
    } catch (error) {
      setSubmitError(error.message || "Unable to add customer right now.");
    } finally {
      setIsSaving(false);
    }
  };

  const sendWhatsApp = async () => {
    if (!generatedCoupon) {
      return;
    }

    const message = buildWhatsAppMessage(generatedCoupon);
    const url = `https://wa.me/91${generatedCoupon.phoneNumber}?text=${encodeURIComponent(
      message
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
    await markWhatsAppSent(generatedCoupon.id);
  };

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Customer Entry"
        title="Create a coupon entry with purchase details for the lucky draw."
        description="Every saved entry creates one coupon for each Rs. 2400 spent and stores the full set in Firestore for the lucky draw."
        sideTitle="Required Fields"
        sideContent={
          <ul className="space-y-3 text-sm leading-6">
            <li>1. Customer Name</li>
            <li>2. Phone Number</li>
            <li>3. Eligible purchase amount of Rs. 2400 or more</li>
            <li>4. Shop Name</li>
            <li>5. Store Image</li>
            <li>6. Draw Date</li>
          </ul>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="panel-card p-6">
          <SectionHeader
            title={isEditing ? "Edit Customer Entry" : "Add Customer Entry"}
            description={
              isEditing
                ? "Update the customer details and save the changes."
                : "Coupons will be generated automatically after save."
            }
          />

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Customer Name
              </span>
              <input
                {...register("customerName", {
                  required: "Customer name is required",
                })}
                placeholder="Enter customer name"
                className="input-field"
              />
              {errors.customerName && (
                <p className="form-error">{errors.customerName.message}</p>
              )}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Phone Number
              </span>
              <input
                {...register("phoneNumber", {
                  required: "Phone number is required",
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: "Phone number must be 10 digits",
                  },
                })}
                placeholder="9876543210"
                className="input-field"
              />
              {errors.phoneNumber && (
                <p className="form-error">{errors.phoneNumber.message}</p>
              )}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Purchase Amount
              </span>
              <input
                type="number"
                {...register("purchaseAmount", {
                  required: "Purchase amount is required",
                  min: {
                    value: 2400,
                    message: "Purchase amount must be at least Rs. 2400",
                  },
                })}
                placeholder="Greater than or equal to Rs. 2400"
                className="input-field"
              />
              {errors.purchaseAmount && (
                <p className="form-error">{errors.purchaseAmount.message}</p>
              )}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Shop Name</span>
              <input
                {...register("shopName", {
                  required: "Shop name is required",
                })}
                placeholder="Enter shop name"
                className="input-field"
              />
              {errors.shopName && (
                <p className="form-error">{errors.shopName.message}</p>
              )}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Store Image</span>
              <input
                type="file"
                accept="image/*"
                {...register("storeImage", {
                  validate: (value) => {
                    if (isEditing) {
                      return true;
                    }

                    return value?.length
                      ? true
                      : "Store image is required";
                  },
                })}
                className="input-field file:mr-4 file:rounded-full file:border-0 file:bg-[var(--card-strong)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--text)]"
              />
              {isEditing && editingCustomer?.storeImageUrl ? (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Leave this empty to keep the current stored image.
                </p>
              ) : null}
              {errors.storeImage && (
                <p className="form-error">{errors.storeImage.message}</p>
              )}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                Draw Date
              </span>
              <input
                type="date"
                {...register("drawDate", {
                  required: "Draw date is required",
                })}
                className="input-field"
              />
              {errors.drawDate && (
                <p className="form-error">{errors.drawDate.message}</p>
              )}
            </label>

            {submitError && <div className="status-error">{submitError}</div>}

            <div className="flex flex-wrap gap-3">
              <button type="submit" className="btn-primary" disabled={isSaving}>
                {isSaving
                  ? isEditing
                    ? "Updating Entry..."
                    : "Saving Entry..."
                  : isEditing
                    ? "Update Entry"
                    : "Generate Coupon & Save"}
              </button>
              {isEditing ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => navigate("/", { replace: true })}
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="panel-card p-6">
          <SectionHeader
            title="Latest Generated Coupon"
            description="After saving, open WhatsApp with a ready-made message for the customer."
          />

          {isEditing ? (
            <div className="mt-6">
              <EmptyStateCard message="Edit mode is active. Save the updated customer entry to return to the dashboard." />
            </div>
          ) : !generatedCoupon ? (
            <div className="mt-6">
              <EmptyStateCard message="No customer has been added in this session yet." />
            </div>
          ) : (
            <div className="mt-6 space-y-4 rounded-[28px] border border-emerald-200 bg-emerald-50/90 p-5">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-emerald-700">
                Coupons Created
              </p>
              <p className="text-3xl font-semibold text-emerald-900">
                {generatedCoupon.couponCount} Coupon{generatedCoupon.couponCount > 1 ? "s" : ""}
              </p>
              <div className="space-y-2 text-sm text-emerald-900/85">
                <p>Customer: {generatedCoupon.customerName}</p>
                <p>Phone: {generatedCoupon.phoneNumber}</p>
                <p>Draw Date: {generatedCoupon.drawDate}</p>
                <p>Shop: {generatedCoupon.shopName}</p>
                <p>Codes: {generatedCoupon.couponNumbers.join(", ")}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={sendWhatsApp} className="btn-primary">
                  Open WhatsApp Message
                </button>
                {generatedCoupon.storeImageUrl ? (
                  <a
                    href={generatedCoupon.storeImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                  >
                    View Store Image
                  </a>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
