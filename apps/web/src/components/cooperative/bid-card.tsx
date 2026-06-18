"use client";

/**
 * BidCard — individual buyer bid card with "Acceptă & Vinde" CTA.
 *
 * Shows: buyer name, price (large/bold/green), advantage vs local,
 * volume, deadline, delivery, payment terms.
 * "Acceptă & Vinde" opens bank-grade AlertDialog confirmation.
 * After confirmation → success toast.
 */
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Currency } from "@/components/shared/currency";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  TrendingUp,
  Calendar,
  MapPin,
  CreditCard,
  ShieldCheck,
  Truck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { Bid } from "@/types/cooperative";

interface BidCardProps {
  bid: Bid;
  yourTons: number;
}

export function BidCard({ bid, yourTons }: BidCardProps) {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const yourRevenue = yourTons * bid.price_per_ton;
  const localRevenue = yourTons * bid.local_market_price;
  const netBenefit = yourRevenue - localRevenue;
  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(bid.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ),
  );

  const handleConfirm = () => {
    setIsConfirming(true);
    // Simulate API call
    setTimeout(() => {
      setIsConfirming(false);
      toast.success("Ofertă acceptată", {
        description: `Cod UIT în curs de generare pentru ${yourTons}t către ${bid.buyer_name}.`,
        duration: 5000,
      });
    }, 1500);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-bold text-slate-900">{bid.buyer_name}</h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            <MapPin className="h-3 w-3 text-slate-400" />
            <span className="text-xs text-slate-500">{bid.delivery_location}</span>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] border-green-200 bg-green-50 text-green-700">
          Activ
        </Badge>
      </div>

      {/* Price highlight */}
      <div className="bg-green-50 rounded-xl p-4 border border-green-100">
        <p className="text-[11px] text-green-600 uppercase tracking-wide font-medium mb-1">
          Preț oferit
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-green-700">
            {bid.price_per_ton.toLocaleString("ro-RO")}
          </span>
          <span className="text-base font-medium text-green-600">RON/t</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <TrendingUp className="h-3.5 w-3.5 text-green-600" />
          <span className="text-sm font-bold text-green-700">
            +{bid.advantage_ron} RON
          </span>
          <span className="text-xs text-green-600">vs piață locală</span>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500">
          <Truck className="h-3.5 w-3.5" />
          <span>Volum: <span className="font-medium text-slate-700">{bid.volume_tons.toLocaleString("ro-RO")}t</span></span>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <Calendar className="h-3.5 w-3.5" />
          <span>Termen: <span className="font-medium text-slate-700">{daysLeft} zile</span></span>
        </div>
        <div className="col-span-2 flex items-center gap-2 text-slate-500">
          <CreditCard className="h-3.5 w-3.5" />
          <span>{bid.payment_terms}</span>
        </div>
      </div>

      {/* Your estimated revenue */}
      <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
          Estimare pentru dvs. ({yourTons}t)
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Venit estimat</span>
          <span className="text-base font-bold text-slate-900">
            <Currency value={yourRevenue} />
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">vs piață locală</span>
          <span className="text-sm text-slate-400">
            <Currency value={localRevenue} />
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
          <span className="text-sm font-medium text-green-700">Beneficiu net</span>
          <span className="text-base font-bold text-green-700">
            +<Currency value={netBenefit} />
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="flex-1 h-11 text-sm font-bold gap-2">
              <ShieldCheck className="h-4 w-4" />
              Acceptă & Vinde
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-brand-600" />
                Confirmă vânzarea
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3 text-sm leading-relaxed">
                <span className="block">
                  Confirmi vânzarea a <strong>{yourTons}t grâu</strong> către{" "}
                  <strong>{bid.buyer_name}</strong> la{" "}
                  <strong>{bid.price_per_ton.toLocaleString("ro-RO")} RON/t</strong>?
                </span>
                <span className="block bg-green-50 rounded-lg p-3 border border-green-100 text-green-800 font-medium text-base">
                  Valoare totală estimată:{" "}
                  <span className="font-bold">
                    {yourRevenue.toLocaleString("ro-RO")} RON
                  </span>
                </span>
                <span className="block text-xs text-slate-500 flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 shrink-0" />
                  Livrare: {bid.delivery_location}
                </span>
                <span className="block text-xs text-slate-500 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 shrink-0" />
                  {bid.payment_terms}
                </span>
                <span className="block text-xs text-slate-400 border-t border-slate-100 pt-2 mt-2">
                  Codurile UIT (e-Transport) vor fi generate automat după confirmare.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-10">Anulează</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirm}
                disabled={isConfirming}
                className="h-10 bg-brand-600 hover:bg-brand-700 text-white font-bold gap-2"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Se procesează...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Confirmă vânzarea
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button variant="outline" className="h-11 text-sm">
          Detalii
        </Button>
      </div>
    </div>
  );
}
