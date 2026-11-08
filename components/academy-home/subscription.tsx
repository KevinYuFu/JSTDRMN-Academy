import Link from "next/link";
import styles from "./home.module.css";

export function SubscriptionSection({
  showsTwenty,
  hasCheckout,
  checkoutMatchesTwenty,
}: {
  /** True only when a stored monthly plan or the Headliner price is exactly $20. */
  showsTwenty: boolean;
  /** True when the existing Headliner subscribe control is on this page. */
  hasCheckout: boolean;
  checkoutMatchesTwenty: boolean;
}) {
  return (
    <section
      className={hasCheckout ? styles.section : `${styles.section} ${styles.end}`}
      id="subscription"
      aria-labelledby="subscription-heading"
    >
      <h2 id="subscription-heading">Learn more. Help the community grow.</h2>
      <p className={styles.lede}>
        {showsTwenty
          ? "A $20/month subscription opens the tutorial library. "
          : "A monthly subscription opens the tutorial library. "}
        Subscriptions help JSTDRMN keep fostering community and creating opportunities.
      </p>
      {hasCheckout && !checkoutMatchesTwenty ? (
        <p className={styles.note}>The subscribe button opens the existing subscription page and uses the price shown there.</p>
      ) : null}
      {hasCheckout ? null : (
        <>
          <p className={styles.note}>This page does not start a purchase.</p>
          <div className={styles.action}>
            <Link className="pill pill-purple" href="/programs">
              Browse programs
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
