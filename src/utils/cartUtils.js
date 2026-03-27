export const getCartUserPhone = () =>
  localStorage.getItem("userPhone") || localStorage.getItem("phone") || "guest";

export const getCartStorageKey = (userPhone = getCartUserPhone()) => `cart_${userPhone}`;

export const getQuantityStep = (unitType) => {
  const unit = String(unitType || "").toLowerCase();
  if (unit === "g") return 50;
  if (unit === "kg" || unit === "litre") return 0.1;
  return 1;
};

export const sanitizeQuantity = (value, isLooseItem = false, unitType = "") => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return isLooseItem ? getQuantityStep(unitType) : 1;
  if (!isLooseItem) return Math.max(1, Math.round(parsed));

  const step = getQuantityStep(unitType);
  const snapped = Math.round(parsed / step) * step;
  return Number(Math.max(step, snapped).toFixed(3));
};

const normalizeAnyId = (value) => {
  if (value === null || value === undefined) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  // Handle BSON-like values such as { $oid: "..." }.
  if (typeof value === "object") {
    if (typeof value.$oid === "string") return value.$oid.trim();
    if (typeof value.id === "string" || typeof value.id === "number") {
      return String(value.id).trim();
    }
  }

  return "";
};

export const normalizeProductId = (product) =>
  normalizeAnyId(
    product?.id ?? product?._id ?? product?.product_id ?? product?.productId ?? ""
  );

const safeParseArray = (raw, fallback = []) => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      // Storage full — clear legacy cart keys to free space, then retry once
      ["cart", "cart_null", "cart_undefined", "cart_"].forEach((k) => {
        localStorage.removeItem(k);
      });
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
};

const sanitizeCartImage = (image) => {
  if (typeof image !== "string") return "";

  const trimmed = image.trim();
  // Avoid storing large inline/base64 image payloads in localStorage.
  if (trimmed.startsWith("data:image")) return "";

  return trimmed;
};

const normalizeCartItem = (item) => ({
  product_id: normalizeProductId(item),
  name: item?.name || "Unknown Product",
  price: Number(item?.price) || 0,
  price_per_unit: Number(item?.price_per_unit ?? item?.price) || 0,
  unit_type: item?.unit_type || "unit",
  is_loose_item: Boolean(item?.is_loose_item),
  image: sanitizeCartImage(item?.image),
  location: item?.location || "",
  quantity: sanitizeQuantity(item?.quantity, Boolean(item?.is_loose_item), item?.unit_type || "unit"),
});

const mergeCartItemsByProductId = (items) => {
  const map = new Map();

  items.forEach((raw) => {
    const item = normalizeCartItem(raw);
    if (!item.product_id) return;

    const existing = map.get(item.product_id);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      map.set(item.product_id, item);
    }
  });

  return Array.from(map.values());
};

export const readCartItems = (userPhone = getCartUserPhone()) => {
  const key = getCartStorageKey(userPhone);
  const canonical = safeParseArray(localStorage.getItem(key) || "[]");

  const legacyKeys = ["cart", "cart_null", "cart_undefined", "cart_"];
  const legacyItems = legacyKeys.flatMap((legacyKey) => {
    return safeParseArray(localStorage.getItem(legacyKey) || "[]");
  });

  const merged = mergeCartItemsByProductId([
    ...canonical,
    ...legacyItems,
  ]);

  safeSetItem(key, JSON.stringify(merged));
  legacyKeys.forEach((legacyKey) => localStorage.removeItem(legacyKey));

  return merged;
};

export const writeCartItems = (items, userPhone = getCartUserPhone()) => {
  const key = getCartStorageKey(userPhone);
  const normalized = mergeCartItemsByProductId(Array.isArray(items) ? items : []);
  safeSetItem(key, JSON.stringify(normalized));
  return normalized;
};

export const addItemToCart = (product, quantity = 1, userPhone = getCartUserPhone()) => {
  const productId = normalizeProductId(product);
  if (!productId) {
    return { ok: false, items: readCartItems(userPhone), reason: "invalid-product" };
  }

  const isLooseItem = Boolean(product?.is_loose_item);
  const unitType = product?.unit_type || "unit";
  const quantityToAdd = sanitizeQuantity(quantity, isLooseItem, unitType);

  const items = readCartItems(userPhone);
  const index = items.findIndex((item) => String(item.product_id) === productId);

  if (index >= 0) {
    const baseQty = sanitizeQuantity(items[index].quantity, Boolean(items[index].is_loose_item), items[index].unit_type || "unit");
    items[index].quantity = sanitizeQuantity(baseQty + quantityToAdd, Boolean(items[index].is_loose_item), items[index].unit_type || "unit");
  } else {
    items.push({
      product_id: productId,
      name: product?.name || "Unknown Product",
      price: Number(product?.price) || 0,
      price_per_unit: Number(product?.price_per_unit ?? product?.price) || 0,
      unit_type: unitType,
      is_loose_item: isLooseItem,
      image: sanitizeCartImage(product?.image),
      location: product?.location || "",
      quantity: quantityToAdd,
    });
  }

  return { ok: true, items: writeCartItems(items, userPhone) };
};
