// The examples offered on the page; their names are App.sql.examples.<id> in messages/*.json.
export const EXAMPLES = [
  { id: "select", code: "SELECT * FROM products;\n" },
  { id: "where", code: "SELECT name, price\nFROM products\nWHERE price >= 150\nORDER BY price DESC;\n" },
  { id: "group", code: "SELECT category,\n  COUNT(*) AS items,\n  MIN(price) AS cheapest,\n  ROUND(AVG(price), 1) AS average\nFROM products\nGROUP BY category\nORDER BY items DESC;\n" },
  {
    id: "join",
    code: "SELECT o.id, o.ordered_on, c.name AS customer, p.name AS product,\n  o.quantity, p.price * o.quantity AS amount\nFROM orders AS o\nJOIN customers AS c ON c.id = o.customer_id\nJOIN products AS p ON p.id = o.product_id\nORDER BY o.ordered_on;\n",
  },
  {
    id: "leftJoin",
    code: "-- Every customer, with what they spent (0 for those who never ordered).\nSELECT c.name, c.city,\n  COUNT(o.id) AS orders,\n  COALESCE(SUM(p.price * o.quantity), 0) AS spent\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.id\nLEFT JOIN products AS p ON p.id = o.product_id\nGROUP BY c.id\nORDER BY spent DESC;\n",
  },
  {
    id: "subquery",
    code: "-- Products dearer than the average, and products nobody has bought.\nSELECT name, price FROM products\nWHERE price > (SELECT AVG(price) FROM products);\n\nSELECT name FROM products\nWHERE id NOT IN (SELECT product_id FROM orders);\n",
  },
  {
    id: "window",
    code: "-- Sales per month, with a running total and a rank.\nWITH monthly AS (\n  SELECT strftime('%Y-%m', o.ordered_on) AS month,\n    SUM(p.price * o.quantity) AS sales\n  FROM orders AS o JOIN products AS p ON p.id = o.product_id\n  GROUP BY month\n)\nSELECT month, sales,\n  SUM(sales) OVER (ORDER BY month) AS running_total,\n  RANK() OVER (ORDER BY sales DESC) AS rank\nFROM monthly\nORDER BY month;\n",
  },
  {
    id: "create",
    code: "-- Each run starts again from the sample tables, so feel free to change them.\nCREATE TABLE reviews (\n  product_id INTEGER,\n  stars INTEGER CHECK (stars BETWEEN 1 AND 5)\n);\n\nINSERT INTO reviews VALUES (1, 5), (1, 4), (4, 3), (6, 5), (6, 4), (6, 2);\nUPDATE products SET price = price + 20 WHERE category = (SELECT category FROM products WHERE id = 6);\n\nSELECT p.name, p.price, ROUND(AVG(r.stars), 2) AS stars, COUNT(*) AS reviews\nFROM reviews AS r JOIN products AS p ON p.id = r.product_id\nGROUP BY p.id;\n",
  },
] as const;
