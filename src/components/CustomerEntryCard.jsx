import { useEffect, useRef, useState } from "react";
import { CircleCheck, MessageCircle, MoreVertical, Pencil, Trash2 } from "lucide-react";

const iconMap = {
  edit: Pencil,
  delete: Trash2,
  whatsapp: MessageCircle,
  sent: CircleCheck,
};

const CustomerEntryCard = ({ customer, meta, menuActions = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="rounded-3xl border border-[var(--line)] bg-[var(--card)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold">{customer.customerName}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {customer.phoneNumber} | {customer.shopName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--card-strong)] px-3 py-1 text-xs font-semibold tracking-[0.18em] text-[var(--muted)]">
            {customer.couponNumber}
          </span>

          {menuActions.length > 0 ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsOpen((currentValue) => !currentValue)}
                className="rounded-full border border-[var(--line)] bg-white/80 p-2 text-[var(--muted)] transition hover:bg-white hover:text-[var(--text)]"
                aria-label="Open customer actions"
              >
                <MoreVertical size={16} />
              </button>

              {isOpen ? (
                <div className="absolute right-0 top-11 z-10 min-w-48 rounded-2xl border border-[var(--line)] bg-white p-2 shadow-[var(--shadow-soft)]">
                  {menuActions.map((action) => {
                    const ActionIcon = iconMap[action.icon] || MoreVertical;

                    return (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          action.onClick(customer);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                          action.variant === "danger"
                            ? "text-red-700 hover:bg-red-50"
                            : "text-[var(--text)] hover:bg-[var(--card)]"
                        }`}
                      >
                        <ActionIcon size={16} />
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {meta ? <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--muted)]">{meta}</div> : null}
    </div>
  );
};

export default CustomerEntryCard;
