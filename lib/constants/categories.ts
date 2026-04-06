/**
 * System transaction categories — seeded on first user creation.
 * These are the default Indian-context categories.
 */

export interface SystemCategory {
  id: string        // stable ID used in seed
  name: string
  icon: string      // emoji
  color: string     // hex
  type: 'income' | 'expense' | 'investment' | 'transfer'
  parentId?: string
}

export const SYSTEM_CATEGORIES: SystemCategory[] = [
  // ── INCOME ────────────────────────────────────────────────────────────────
  { id: 'inc_salary',       name: 'Salary',              icon: '💼', color: '#22c55e', type: 'income' },
  { id: 'inc_freelance',    name: 'Freelance Income',    icon: '💻', color: '#22c55e', type: 'income' },
  { id: 'inc_business',     name: 'Business Income',     icon: '🏢', color: '#22c55e', type: 'income' },
  { id: 'inc_rental',       name: 'Rental Income',       icon: '🏠', color: '#22c55e', type: 'income' },
  { id: 'inc_interest',     name: 'Interest & Dividends',icon: '📈', color: '#22c55e', type: 'income' },
  { id: 'inc_capgains',     name: 'Capital Gains',       icon: '💹', color: '#22c55e', type: 'income' },
  { id: 'inc_gift',         name: 'Gifts Received',      icon: '🎁', color: '#22c55e', type: 'income' },
  { id: 'inc_refund',       name: 'Refunds',             icon: '↩️', color: '#22c55e', type: 'income' },
  { id: 'inc_other',        name: 'Other Income',        icon: '💰', color: '#22c55e', type: 'income' },

  // ── FOOD & DINING ─────────────────────────────────────────────────────────
  { id: 'food_grocery',     name: 'Groceries',           icon: '🛒', color: '#f97316', type: 'expense' },
  { id: 'food_delivery',    name: 'Zomato / Swiggy',     icon: '🍕', color: '#f97316', type: 'expense' },
  { id: 'food_restaurant',  name: 'Restaurants & Cafes', icon: '🍽️', color: '#f97316', type: 'expense' },
  { id: 'food_dairy',       name: 'Milk & Dairy',        icon: '🥛', color: '#f97316', type: 'expense' },
  { id: 'food_vegetables',  name: 'Vegetables & Fruits', icon: '🥦', color: '#f97316', type: 'expense' },

  // ── TRANSPORT ─────────────────────────────────────────────────────────────
  { id: 'trans_fuel',       name: 'Petrol / Diesel',     icon: '⛽', color: '#3b82f6', type: 'expense' },
  { id: 'trans_cab',        name: 'Ola / Uber',          icon: '🚗', color: '#3b82f6', type: 'expense' },
  { id: 'trans_public',     name: 'Metro / Bus / Auto',  icon: '🚇', color: '#3b82f6', type: 'expense' },
  { id: 'trans_emi',        name: 'Vehicle EMI',         icon: '🚘', color: '#3b82f6', type: 'expense' },
  { id: 'trans_insurance',  name: 'Vehicle Insurance',   icon: '🛡️', color: '#3b82f6', type: 'expense' },
  { id: 'trans_parking',    name: 'Parking & Tolls',     icon: '🅿️', color: '#3b82f6', type: 'expense' },
  { id: 'trans_maintenance',name: 'Vehicle Maintenance', icon: '🔧', color: '#3b82f6', type: 'expense' },

  // ── HOUSING ───────────────────────────────────────────────────────────────
  { id: 'house_rent',       name: 'Rent',                icon: '🏠', color: '#8b5cf6', type: 'expense' },
  { id: 'house_emi',        name: 'Home Loan EMI',       icon: '🏦', color: '#8b5cf6', type: 'expense' },
  { id: 'house_maintenance',name: 'Society Maintenance', icon: '🏘️', color: '#8b5cf6', type: 'expense' },
  { id: 'house_electricity',name: 'Electricity',         icon: '⚡', color: '#8b5cf6', type: 'expense' },
  { id: 'house_water',      name: 'Water',               icon: '💧', color: '#8b5cf6', type: 'expense' },
  { id: 'house_gas',        name: 'Gas (Piped / LPG)',   icon: '🔥', color: '#8b5cf6', type: 'expense' },
  { id: 'house_internet',   name: 'Internet',            icon: '📡', color: '#8b5cf6', type: 'expense' },
  { id: 'house_repair',     name: 'Home Repairs',        icon: '🔨', color: '#8b5cf6', type: 'expense' },

  // ── HEALTHCARE ────────────────────────────────────────────────────────────
  { id: 'health_medicine',  name: 'Medicines',           icon: '💊', color: '#ec4899', type: 'expense' },
  { id: 'health_doctor',    name: 'Doctor Consultation', icon: '👨‍⚕️', color: '#ec4899', type: 'expense' },
  { id: 'health_hospital',  name: 'Hospitalisation',     icon: '🏥', color: '#ec4899', type: 'expense' },
  { id: 'health_insurance', name: 'Health Insurance',    icon: '🛡️', color: '#ec4899', type: 'expense' },
  { id: 'health_diagnostic',name: 'Diagnostics & Tests', icon: '🧪', color: '#ec4899', type: 'expense' },

  // ── ENTERTAINMENT ─────────────────────────────────────────────────────────
  { id: 'ent_ott',          name: 'OTT (Netflix, Prime)', icon: '📺', color: '#14b8a6', type: 'expense' },
  { id: 'ent_movies',       name: 'Movie Tickets',       icon: '🎬', color: '#14b8a6', type: 'expense' },
  { id: 'ent_gaming',       name: 'Gaming',              icon: '🎮', color: '#14b8a6', type: 'expense' },
  { id: 'ent_books',        name: 'Books & Magazines',   icon: '📚', color: '#14b8a6', type: 'expense' },
  { id: 'ent_travel',       name: 'Travel & Vacation',   icon: '✈️', color: '#14b8a6', type: 'expense' },

  // ── SHOPPING ──────────────────────────────────────────────────────────────
  { id: 'shop_clothing',    name: 'Clothing & Fashion',  icon: '👕', color: '#f59e0b', type: 'expense' },
  { id: 'shop_electronics', name: 'Electronics',         icon: '📱', color: '#f59e0b', type: 'expense' },
  { id: 'shop_home',        name: 'Home & Furniture',    icon: '🛋️', color: '#f59e0b', type: 'expense' },
  { id: 'shop_online',      name: 'Amazon / Flipkart',   icon: '📦', color: '#f59e0b', type: 'expense' },
  { id: 'shop_beauty',      name: 'Beauty & Personal Care', icon: '💄', color: '#f59e0b', type: 'expense' },

  // ── EDUCATION ─────────────────────────────────────────────────────────────
  { id: 'edu_fees',         name: 'School / College Fees', icon: '🎓', color: '#6366f1', type: 'expense' },
  { id: 'edu_coaching',     name: 'Tuition / Coaching',  icon: '📝', color: '#6366f1', type: 'expense' },
  { id: 'edu_online',       name: 'Online Courses',      icon: '💡', color: '#6366f1', type: 'expense' },

  // ── INVESTMENTS ───────────────────────────────────────────────────────────
  { id: 'inv_sip',          name: 'SIP / Mutual Fund',   icon: '📊', color: '#0ea5e9', type: 'investment' },
  { id: 'inv_stocks',       name: 'Stocks',              icon: '📈', color: '#0ea5e9', type: 'investment' },
  { id: 'inv_ppf',          name: 'PPF',                 icon: '🏛️', color: '#0ea5e9', type: 'investment' },
  { id: 'inv_nps',          name: 'NPS',                 icon: '👴', color: '#0ea5e9', type: 'investment' },
  { id: 'inv_fd',           name: 'Fixed Deposit',       icon: '🏦', color: '#0ea5e9', type: 'investment' },
  { id: 'inv_gold',         name: 'Gold / SGB',          icon: '🥇', color: '#0ea5e9', type: 'investment' },
  { id: 'inv_crypto',       name: 'Crypto',              icon: '₿',  color: '#0ea5e9', type: 'investment' },

  // ── FINANCIAL (EMI / LOANS) ───────────────────────────────────────────────
  { id: 'fin_home_emi',     name: 'Home Loan EMI',       icon: '🏠', color: '#dc2626', type: 'expense' },
  { id: 'fin_car_emi',      name: 'Car Loan EMI',        icon: '🚗', color: '#dc2626', type: 'expense' },
  { id: 'fin_personal_emi', name: 'Personal Loan EMI',   icon: '💳', color: '#dc2626', type: 'expense' },
  { id: 'fin_cc_payment',   name: 'Credit Card Payment', icon: '💳', color: '#dc2626', type: 'expense' },
  { id: 'fin_life_ins',     name: 'Life Insurance',      icon: '🛡️', color: '#dc2626', type: 'expense' },
  { id: 'fin_lap',          name: 'Loan Against Property',icon: '🏢', color: '#dc2626', type: 'expense' },

  // ── UTILITIES & OTHERS ────────────────────────────────────────────────────
  { id: 'util_mobile',      name: 'Mobile Recharge',     icon: '📱', color: '#64748b', type: 'expense' },
  { id: 'util_dth',         name: 'DTH / Cable',         icon: '📡', color: '#64748b', type: 'expense' },
  { id: 'util_charity',     name: 'Charity & Donations', icon: '❤️', color: '#64748b', type: 'expense' },
  { id: 'util_gift_given',  name: 'Gifts Given',         icon: '🎁', color: '#64748b', type: 'expense' },
  { id: 'util_misc',        name: 'Miscellaneous',       icon: '📌', color: '#64748b', type: 'expense' },

  // ── TRANSFER ──────────────────────────────────────────────────────────────
  { id: 'tfr_internal',     name: 'Account Transfer',    icon: '🔄', color: '#94a3b8', type: 'transfer' },
  { id: 'tfr_atm',          name: 'ATM Withdrawal',      icon: '🏧', color: '#94a3b8', type: 'transfer' },
]

/** Get category by stable ID */
export function getCategoryById(id: string): SystemCategory | undefined {
  return SYSTEM_CATEGORIES.find((c) => c.id === id)
}

/** Get all categories of a given type */
export function getCategoriesByType(type: SystemCategory['type']): SystemCategory[] {
  return SYSTEM_CATEGORIES.filter((c) => c.type === type)
}
