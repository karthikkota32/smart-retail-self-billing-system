export const getCartUserPhone = () =>
  localStorage.getItem("userPhone") || localStorage.getItem("phone") || "guest";

export const getCartStorageKey = (userPhone = getCartUserPhone()) => `cart_${userPhone}`;

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
  image: sanitizeCartImage(item?.image),
  location: item?.location || "",
  quantity: Math.max(1, Number(item?.quantity) || 1),
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

  const items = readCartItems(userPhone);
  const index = items.findIndex((item) => String(item.product_id) === productId);

  if (index >= 0) {
    items[index].quantity = Math.max(1, Number(items[index].quantity) || 1) + Math.max(1, Number(quantity) || 1);
  } else {
    items.push({
      product_id: productId,
      name: product?.name || "Unknown Product",
      price: Number(product?.price) || 0,
      image: sanitizeCartImage(product?.image),
      location: product?.location || "",
      quantity: Math.max(1, Number(quantity) || 1),
    });
  }

  return { ok: true, items: writeCartItems(items, userPhone) };
};
