/**
 * Mock APIA evidence vault — partial completion checklist.
 */
import type { ApiaVault } from "@/types/apia-vault";

const APIA_VAULT: ApiaVault = {
  farm_id: "00000000-0000-0000-0000-000000000001",
  campaign_year: 2026,
  total_items: 8,
  completed_items: 5,
  completion_pct: 62.5,
  checklist: [
    {
      id: "AV-01",
      label: "Declarație unică de suprafață",
      description: "Formularul IPA depus la APIA până la 15 mai 2026.",
      completed: true,
      due_date: "2026-05-15",
      evidence_type: "declaration",
      uploaded_count: 1,
      required_count: 1,
    },
    {
      id: "AV-02",
      label: "Contract de arendă",
      description: "Contracte de arendă legalizate pentru toate parcelele exploatate.",
      completed: true,
      due_date: null,
      evidence_type: "document",
      uploaded_count: 6,
      required_count: 6,
    },
    {
      id: "AV-03",
      label: "Fotografii geolocalizate — parcele grâu",
      description: "Minimum 4 fotografii cu GPS per parcelă de grâu (cultura principală).",
      completed: false,
      due_date: "2026-06-01",
      evidence_type: "photo",
      uploaded_count: 8,
      required_count: 12,
    },
    {
      id: "AV-04",
      label: "Fotografii geolocalizate — parcele porumb",
      description: "Minimum 4 fotografii cu GPS per parcelă de porumb (la răsărire).",
      completed: false,
      due_date: "2026-07-15",
      evidence_type: "photo",
      uploaded_count: 0,
      required_count: 4,
    },
    {
      id: "AV-05",
      label: "Verificare cultură la fața locului",
      description: "Confirmarea culturii declarate prin verificare vizuală sau satelitară.",
      completed: true,
      due_date: null,
      evidence_type: "inspection",
      uploaded_count: 4,
      required_count: 4,
    },
    {
      id: "AV-06",
      label: "Registru de tratamente fitosanitare",
      description: "Caietul de câmp completat cu toate tratamentele aplicate.",
      completed: true,
      due_date: "2026-10-01",
      evidence_type: "document",
      uploaded_count: 1,
      required_count: 1,
    },
    {
      id: "AV-07",
      label: "Condiționalitate — GAEC 6 (acoperire sol)",
      description: "Dovada acoperirii solului în perioada critică (nov-feb).",
      completed: true,
      due_date: null,
      evidence_type: "document",
      uploaded_count: 2,
      required_count: 2,
    },
    {
      id: "AV-08",
      label: "Eco-schemă — rotație culturilor",
      description: "Dovada rotației culturilor pe minimum 3 parcele pentru eco-schema.",
      completed: false,
      due_date: "2026-09-30",
      evidence_type: "document",
      uploaded_count: 0,
      required_count: 3,
    },
  ],
};

export const mockApiaVault = {
  get: () => APIA_VAULT,
};
