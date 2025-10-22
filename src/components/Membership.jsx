import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../services/authService";
import { fetchBenefits, getDetailedBenefits } from "../services/benefitsService";

export default function Membership() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState("");

  // Check if user is logged in
  useEffect(() => {
    async function loadUser() {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        navigate("/register?redirect=/membership");
        return;
      }
      setUser(currentUser);
    }
    loadUser();
  }, [navigate]);

  // Fetch membership plans from backend
  useEffect(() => {
    async function loadPlans() {
      try {
        const benefits = await fetchBenefits();
        setPlans(benefits);
        if (benefits.length > 0) {
          setSelectedPlan(benefits[0].membership_type);
        }
      } catch (err) {
        setError("Failed to load membership plans");
        console.error(err);
      } finally {
        setLoadingPlans(false);
      }
    }
    loadPlans();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    
    if (!selectedPlan) {
      setError("Please select a membership plan");
      return;
    }

    // Navigate to checkout with membership data
    navigate("/checkout-membership", {
      state: {
        checkoutType: "membership",
        membershipData: {
          plan: selectedPlanDetails,
          user: user
        }
      }
    });
  }

  // Show loading while checking auth or loading plans
  if (!user || loadingPlans) {
    return (
      <main className="auth-page">
        <header className="hero hero--teal">
          <div className="container hero__inner">
            <h1 className="hero__title">Membership</h1>
          </div>
        </header>
        <section className="container py-8">
          <p className="text-center text-gray-600">Loading...</p>
        </section>
      </main>
    );
  }

  const selectedPlanDetails = plans.find((p) => p.membership_type === selectedPlan);

  return (
    <main className="auth-page">
      <header className="hero hero--teal">
        <div className="container hero__inner">
          <h1 className="hero__title">Upgrade to Membership</h1>
          <p className="hero__sub">
            Enjoy year-round admission, exclusive previews, special events, and more.
          </p>
        </div>
      </header>

      <section className="container py-8 pb-16">
        <div className="card card--spacious max-w-2xl mx-auto">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Choose Your Membership</h2>

            <p className="text-gray-600 mb-6">
              Logged in as: <strong>{user.email}</strong>
            </p>

            {error && (
              <div role="alert" className="alert alert--error mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Plan Selection */}
              <div>
                <label htmlFor="plan" className="block mb-2 font-semibold">
                  Select Membership Plan
                </label>
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <label
                      key={plan.membership_type}
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedPlan === plan.membership_type
                          ? "border-brand bg-brand/10"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="plan"
                          value={plan.membership_type}
                          checked={selectedPlan === plan.membership_type}
                          onChange={(e) => setSelectedPlan(e.target.value)}
                          className="w-4 h-4"
                        />
                        <div>
                          <div className="font-semibold">{plan.membership_type}</div>
                          <div className="text-sm text-gray-600">
                            ${parseFloat(plan.annual_fee).toFixed(2)} per year
                          </div>
                        </div>
                      </div>
                      <div className="text-lg font-bold text-brand">
                        ${parseFloat(plan.annual_fee).toFixed(2)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Benefits Info */}
              {selectedPlanDetails && (
                <div className="bg-gray-50 p-4 rounded-lg min-h-[300px]">
                  <h3 className="font-semibold mb-2">
                    {selectedPlanDetails.membership_type} Benefits:
                  </h3>
                  <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                    {getDetailedBenefits(selectedPlanDetails).map((benefit, index) => (
                      <li key={index}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Total */}
              {selectedPlanDetails && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-semibold">Total:</span>
                    <span className="text-2xl font-bold text-brand">
                      ${parseFloat(selectedPlanDetails.annual_fee).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Billed annually</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  className="btn btn--brand btn--lg"
                  disabled={loading}
                >
                  Proceed to Checkout
                </button>
              </div>

              {/* Note */}
              <p className="text-xs text-center text-gray-500">
                By purchasing, you agree to our terms and conditions
              </p>
            </form>
          </div>
        </div>

        {/* Info Box */}
        <div className="max-w-2xl mx-auto mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> For more information about membership benefits,{" "}
            <Link to="/membership/info" className="link">
              view all membership levels
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
