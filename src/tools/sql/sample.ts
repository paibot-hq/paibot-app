// The sample shop every SQL run starts from: products, customers and their orders. Column names are English, as in
// most databases; names, categories and cities are in the page's language. Customer 6 has no orders and the potato
// chips were never bought, so a LEFT JOIN has something to show.

export type Locale = "ja" | "en" | "zh";

export const TABLES = [
  { name: "products", columns: ["id INTEGER", "name TEXT", "category TEXT", "price INTEGER"] },
  { name: "customers", columns: ["id INTEGER", "name TEXT", "city TEXT", "joined_on TEXT"] },
  { name: "orders", columns: ["id INTEGER", "customer_id INTEGER", "product_id INTEGER", "quantity INTEGER", "ordered_on TEXT"] },
] as const;
export type TableName = (typeof TABLES)[number]["name"];

const PRODUCTS: Record<Locale, [string, string][]> = {
  ja: [["りんご", "果物"], ["バナナ", "果物"], ["みかん", "果物"], ["牛乳", "飲み物"], ["緑茶", "飲み物"], ["コーヒー", "飲み物"], ["食パン", "パン"], ["クロワッサン", "パン"], ["チョコレート", "お菓子"], ["ポテトチップス", "お菓子"]],
  en: [["Apple", "Fruit"], ["Banana", "Fruit"], ["Orange", "Fruit"], ["Milk", "Drinks"], ["Green tea", "Drinks"], ["Coffee", "Drinks"], ["Bread", "Bakery"], ["Croissant", "Bakery"], ["Chocolate", "Snacks"], ["Potato chips", "Snacks"]],
  zh: [["苹果", "水果"], ["香蕉", "水果"], ["橘子", "水果"], ["牛奶", "饮料"], ["绿茶", "饮料"], ["咖啡", "饮料"], ["吐司", "面包"], ["牛角包", "面包"], ["巧克力", "零食"], ["薯片", "零食"]],
};
const PRICES = [150, 100, 80, 210, 130, 180, 230, 160, 120, 150];

const CUSTOMERS: Record<Locale, [string, string][]> = {
  ja: [["佐藤", "東京"], ["鈴木", "大阪"], ["高橋", "東京"], ["田中", "福岡"], ["伊藤", "札幌"], ["渡辺", "大阪"]],
  en: [["Smith", "London"], ["Johnson", "New York"], ["Williams", "London"], ["Brown", "Sydney"], ["Jones", "Toronto"], ["Garcia", "New York"]],
  zh: [["王", "北京"], ["李", "上海"], ["张", "北京"], ["刘", "广州"], ["陈", "成都"], ["杨", "上海"]],
};
const JOINED = ["2025-04-01", "2025-05-12", "2025-06-20", "2025-08-03", "2025-09-15", "2026-01-10"];

// customer, product, quantity, date
const ORDERS: [number, number, number, string][] = [
  [1, 1, 3, "2026-01-05"], [1, 4, 1, "2026-01-05"], [2, 2, 6, "2026-01-08"], [3, 7, 1, "2026-01-12"], [2, 9, 2, "2026-01-15"],
  [4, 5, 2, "2026-01-20"], [1, 6, 1, "2026-02-02"], [5, 3, 10, "2026-02-03"], [3, 1, 2, "2026-02-10"], [4, 8, 3, "2026-02-14"],
  [2, 4, 2, "2026-02-21"], [5, 9, 5, "2026-02-28"], [1, 7, 2, "2026-03-03"], [3, 6, 2, "2026-03-09"], [4, 1, 4, "2026-03-15"],
  [2, 5, 1, "2026-03-18"], [5, 2, 3, "2026-03-22"], [1, 9, 1, "2026-03-30"], [3, 3, 6, "2026-04-02"], [4, 4, 2, "2026-04-06"],
];

// The rows of each table, as the page shows them under "Sample tables" and as the SQL below inserts them.
export function sampleRows(locale: Locale): Record<TableName, (string | number)[][]> {
  return {
    products: PRODUCTS[locale].map(([name, category], i) => [i + 1, name, category, PRICES[i]]),
    customers: CUSTOMERS[locale].map(([name, city], i) => [i + 1, name, city, JOINED[i]]),
    orders: ORDERS.map(([customer, product, quantity, date], i) => [i + 1, customer, product, quantity, date]),
  };
}

const literal = (value: string | number) => (typeof value === "number" ? String(value) : `'${value.replace(/'/g, "''")}'`);

export function sampleSql(locale: Locale) {
  const rows = sampleRows(locale);
  return [
    ...TABLES.map(table => `CREATE TABLE ${table.name} (${table.columns.map((column, i) => (i === 0 ? `${column} PRIMARY KEY` : column)).join(", ")});`),
    ...TABLES.map(table => `INSERT INTO ${table.name} VALUES ${rows[table.name].map(row => `(${row.map(literal).join(", ")})`).join(", ")};`),
  ].join("\n");
}
