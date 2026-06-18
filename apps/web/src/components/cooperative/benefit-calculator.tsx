/**
 * BenefitCalculator — shows farmer's estimated revenue comparison.
 *
 * Compares local market vs best cooperative price, highlights net benefit.
 */
import { Currency } from "@/components/shared/currency";
import { TrendingUp, ArrowRight } from "lucide-react";
import type { Bid } from "@/types/cooperative";

interface BenefitCalculatorProps {
  yourTons: number;
  bids: Bid[];
}

export function BenefitCalculator({ yourTons, bids }: BenefitCalculatorProps) {
  if (bids.length === 0) return null;

  const bestBid = bids.reduce((best, bid) =>
    bid.price_per_ton > best.price_per_ton ? bid : best, bids[0],
  );

  const localRevenue = yourTons * bestBid.local_market_price;
  const coopRevenue = yourTons * bestBid.price_per_ton;
  const netBenefit = coopRevenue - localRevenue;

  return (
    <div className="bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-200 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-green-600" />
        <h3 className="text-sm font-bold text-slate-900">
          Calculul dvs. — {yourTons}t grâu
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Local price */}
        <div className="bg-white rounded-lg p-4 border border-slate-100 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">
            Piață locală
          </p>
          <p className="text-lg font-bold text-slate-400 line-through">
            <Currency value={localRevenue} compact />
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {bestBid.local_market_price.toLocaleString("ro-RO")} RON/t
          </p>
        </div>

        {/* Arrow */}
        <div className="hidden md:flex items-center justify-center">
          <ArrowRight className="h-6 w-6 text-green-400" />
        </div>

        {/* Cooperative price */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-100 text-center">
          <p className="text-[10px] text-green-600 uppercase tracking-wide mb-1">
            Cooperativă (cea mai bună)
          </p>
          <p className="text-lg font-bold text-green-700">
            <Currency value={coopRevenue} compact />
          </p>
          <p className="text-xs text-green-600 mt-0.5">
            {bestBid.price_per_ton.toLocaleString("ro-RO")} RON/t · {bestBid.buyer_name}
          </p>
        </div>
      </div>

      {/* Net benefit */}
      <div className="bg-green-100 rounded-lg p-4 text-center border border-green-200">
        <p className="text-[11px] text-green-700 uppercase tracking-wide font-medium mb-1">
          Beneficiu net estimat
        </p>
        <p className="text-2xl font-black text-green-800">
          +<Currency value={netBenefit} />
        </p>
        <p className="text-xs text-green-600 mt-1">
          +{bestBid.advantage_ron} RON/t × {yourTons}t = beneficiu prin cooperativă
        </p>
      </div>
    </div>
  );
}
