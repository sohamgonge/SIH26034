const variants = {
  g: ["g", "gm", "gms", "gram", "grams"],
  kg: ["kg", "kgs", "kilo", "kilos", "kilogram", "kilograms"],
  ml: ["ml", "mls", "millilitre", "millilitres", "milliliter", "milliliters"],
  l: ["l", "ltr", "ltrs", "litre", "litres", "liter", "liters"],
  cm: ["cm", "cms", "centimetre", "centimetres", "centimeter", "centimeters"],
  m: ["m", "mtr", "mtrs", "metre", "metres", "meter", "meters"],
  mm: ["mm", "mms", "millimetre", "millimetres", "millimeter", "millimeters"],
  N: ["n"],
  U: ["u", "unit", "units", "pc", "pcs", "piece", "pieces"]
};

const lookup = Object.entries(variants).reduce((accumulator, [canonical, spellings]) => {
  spellings.forEach((value) => {
    accumulator[value] = canonical;
  });
  return accumulator;
}, {});

export function normalizeUnit(rawUnit) {
  if (!rawUnit) {
    return null;
  }

  const cleaned = String(rawUnit).trim().toLowerCase().replace(/[.\s]/g, "");
  return lookup[cleaned] || null;
}
