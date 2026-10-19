import blueTemplate from "../assets/cni-blue-template.png";
import greenTemplate from "../assets/cni-green-template.png";
import orangeTemplate from "../assets/cni-orange-template.png";
import violetTemplate from "../assets/cni-violet-template.png";
import yellowTemplate from "../assets/cni-yellow-template.png";
import redTemplate from "../assets/cni-red-template.png";

export const BUILTIN_TEMPLATE_SOURCES = {
  blue: blueTemplate,
  green: greenTemplate,
  orange: orangeTemplate,
  violet: violetTemplate,
  yellow: yellowTemplate,
  red: redTemplate,
};

export const BUILTIN_TEMPLATE_CATALOG = [
  { template_key: "blue", label: "Bleu", asset_path: "builtin:blue" },
  { template_key: "green", label: "Vert", asset_path: "builtin:green" },
  { template_key: "orange", label: "Orange", asset_path: "builtin:orange" },
  { template_key: "violet", label: "Violet", asset_path: "builtin:violet" },
  { template_key: "yellow", label: "Jaune", asset_path: "builtin:yellow" },
  { template_key: "red", label: "Rouge", asset_path: "builtin:red" },
];

export const TEMPLATE_STORAGE_BUCKET = "card-templates";
