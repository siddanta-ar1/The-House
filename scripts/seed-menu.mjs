import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const categories = [{"idx":0,"id":"1265ecbe-6675-449c-9b70-28d1695ab887","name":"Alternatives","display_order":3,"slug":"alternatives"},{"idx":1,"id":"1a155481-e393-4ea3-b983-fe2d626d58ed","name":"Tea","display_order":2,"slug":"tea"},{"idx":2,"id":"d5897645-e7f7-4f2c-a003-7d6b10cb0115","name":"Coffee","display_order":1,"slug":"coffee"},{"idx":3,"id":"f0b88216-18b9-4da0-9316-4bc3f6690cee","name":"Iced","display_order":4,"slug":"iced"}];

// Map category IDs to their specific images
const categoryImages = {
  "1265ecbe-6675-449c-9b70-28d1695ab887": "/menu/alternatives.png",
  "1a155481-e393-4ea3-b983-fe2d626d58ed": "/menu/tea.png",
  "d5897645-e7f7-4f2c-a003-7d6b10cb0115": "/menu/coffee.png",
  "f0b88216-18b9-4da0-9316-4bc3f6690cee": "/menu/iced.png"
};

const menuItems = [{"idx":0,"id":"02149d97-dca5-4975-9691-611e3a9425ef","name":"Hot Peach Tea","description":null,"price":"160.00","image_url":null,"category_id":"1265ecbe-6675-449c-9b70-28d1695ab887","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":1,"id":"0bb26090-aa63-4ce2-b275-0cf0b81697e3","name":"Coffee Shakerato","description":null,"price":"185.00","image_url":null,"category_id":"f0b88216-18b9-4da0-9316-4bc3f6690cee","is_daily":true,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":2,"id":"0d13df20-4423-4a7b-af15-b859827fe94e","name":"Kiwi Lemonade","description":null,"price":"285.00","image_url":null,"category_id":"1265ecbe-6675-449c-9b70-28d1695ab887","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":3,"id":"10a0d02e-ac2b-47ae-a2cc-a6b2717f1514","name":"Apple Peach Tea","description":null,"price":"180.00","image_url":null,"category_id":"1265ecbe-6675-449c-9b70-28d1695ab887","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":4,"id":"14059755-accb-467d-8bf2-fbc7bbf32f57","name":"Iced Cappuccino","description":"Price range: 225 (Reg) / 245 (Lrg)","price":"225.00","image_url":null,"category_id":"f0b88216-18b9-4da0-9316-4bc3f6690cee","is_daily":true,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":5,"id":"143d76bb-7dc8-4e2c-bf73-68989aea24a2","name":"Iced Mocha Madness","description":"Price range: 250 (Reg) / 275 (Lrg)","price":"250.00","image_url":null,"category_id":"f0b88216-18b9-4da0-9316-4bc3f6690cee","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":6,"id":"1e62f159-0a52-4b1d-b5a6-c3b8f5edfdd1","name":"Cafe Mocha","description":"Price range: 230 (Reg) / 250 (Lrg)","price":"230.00","image_url":null,"category_id":"d5897645-e7f7-4f2c-a003-7d6b10cb0115","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":7,"id":"3b09f48a-fe3e-42ad-9418-73b6b6246ac7","name":"Cappuccino","description":"Price range: 210 (Reg) / 230 (Lrg)","price":"210.00","image_url":null,"category_id":"d5897645-e7f7-4f2c-a003-7d6b10cb0115","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":8,"id":"407ce90f-dfef-4a68-bbab-9341793ea91b","name":"Green Tea","description":null,"price":"100.00","image_url":null,"category_id":"1a155481-e393-4ea3-b983-fe2d626d58ed","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":9,"id":"44eab9e1-506e-4251-a614-f61a48fa9c7b","name":"Honey Latte","description":null,"price":"235.00","image_url":null,"category_id":"d5897645-e7f7-4f2c-a003-7d6b10cb0115","is_daily":true,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":10,"id":"4665acf2-05f8-42da-98c7-faa45689ef13","name":"Peach Ice Tea","description":null,"price":"180.00","image_url":null,"category_id":"1265ecbe-6675-449c-9b70-28d1695ab887","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":11,"id":"52925a2d-17fd-4730-bb6a-0917fec08c66","name":"Cafe Mocha Madness","description":"Price range: 235 (Reg) / 265 (Lrg)","price":"235.00","image_url":null,"category_id":"d5897645-e7f7-4f2c-a003-7d6b10cb0115","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":12,"id":"776e44a6-aaf8-4670-89d2-7d3fdaa17c01","name":"Americano","description":"Price range: 145 (Reg) / 165 (Lrg)","price":"145.00","image_url":null,"category_id":"d5897645-e7f7-4f2c-a003-7d6b10cb0115","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":13,"id":"7fc4c4f8-7625-4618-8a4d-e12b4ae43401","name":"Caffe Latte","description":null,"price":"210.00","image_url":null,"category_id":"d5897645-e7f7-4f2c-a003-7d6b10cb0115","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":14,"id":"82f461d1-4db1-46f1-a127-13bb76ed16c4","name":"V60 (Hot/Cold)","description":"Manual Brew. Price range: 230 / 250","price":"230.00","image_url":null,"category_id":"d5897645-e7f7-4f2c-a003-7d6b10cb0115","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":15,"id":"9c4b0a5e-d80d-41ec-8c82-063db1b94b27","name":"Black Tea","description":null,"price":"50.00","image_url":null,"category_id":"1a155481-e393-4ea3-b983-fe2d626d58ed","is_daily":true,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":16,"id":"9dccf224-d448-433a-bd67-d322031b1bfc","name":"Blue Lagoon","description":null,"price":"250.00","image_url":null,"category_id":"1265ecbe-6675-449c-9b70-28d1695ab887","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":17,"id":"a817bafe-a99b-42de-8097-50b9f4a990c4","name":"Espresso Macchiato","description":null,"price":"135.00","image_url":null,"category_id":"d5897645-e7f7-4f2c-a003-7d6b10cb0115","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":18,"id":"a9956065-56ee-44fc-9571-acf5c92432e3","name":"Iced Latte","description":"Price range: 215 (Reg) / 235 (Lrg)","price":"215.00","image_url":null,"category_id":"f0b88216-18b9-4da0-9316-4bc3f6690cee","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":19,"id":"b437164b-4ac1-4219-bd83-03cbf67fc5c2","name":"Hot Lemon","description":"Without ginger and honey. Price range: 130 / 180","price":"130.00","image_url":null,"category_id":"1265ecbe-6675-449c-9b70-28d1695ab887","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":20,"id":"bbeabf7c-b302-46c0-858a-9adc2985fdaa","name":"Iced Honey Latte","description":null,"price":"255.00","image_url":null,"category_id":"f0b88216-18b9-4da0-9316-4bc3f6690cee","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":21,"id":"cd278541-7cc5-43ae-930e-32a6cce71c16","name":"Virgin Mojito","description":null,"price":"275.00","image_url":null,"category_id":"1265ecbe-6675-449c-9b70-28d1695ab887","is_daily":true,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":22,"id":"cd42e018-4f38-4952-ac4b-32e3ecd8500a","name":"Lemon Ginger Tea","description":null,"price":"100.00","image_url":null,"category_id":"1a155481-e393-4ea3-b983-fe2d626d58ed","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":23,"id":"ce19ba4c-ee36-4d56-8c26-d3c480f0995b","name":"Iced Americano","description":"Price range: 185 (Reg) / 210 (Lrg)","price":"185.00","image_url":null,"category_id":"f0b88216-18b9-4da0-9316-4bc3f6690cee","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":24,"id":"d1c01816-6bba-428f-a206-792353fe92e5","name":"Doppio","description":"Double shot","price":"140.00","image_url":null,"category_id":"d5897645-e7f7-4f2c-a003-7d6b10cb0115","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":25,"id":"d91a38da-c5cf-475b-8f6c-d24553fe7451","name":"Caramel Latte","description":"Price range: 245 (Reg) / 265 (Lrg)","price":"245.00","image_url":null,"category_id":"d5897645-e7f7-4f2c-a003-7d6b10cb0115","is_daily":true,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":26,"id":"dbd63bfc-4d9a-4786-b805-def7d6745208","name":"Flat White","description":null,"price":"215.00","image_url":null,"category_id":"d5897645-e7f7-4f2c-a003-7d6b10cb0115","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":27,"id":"dcbc31f9-7975-4142-90ab-e1bd1c512eaf","name":"Iced Caramel Latte","description":"Price range: 255 (Reg) / 275 (Lrg)","price":"255.00","image_url":null,"category_id":"f0b88216-18b9-4da0-9316-4bc3f6690cee","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":28,"id":"e636cf05-30a3-4198-ae0d-b68724f79213","name":"Espresso","description":"Single shot","price":"125.00","image_url":null,"category_id":"d5897645-e7f7-4f2c-a003-7d6b10cb0115","is_daily":true,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":29,"id":"f6d8b700-ef29-45c7-89b4-682acea3ce86","name":"Mint Lemonade","description":null,"price":"235.00","image_url":null,"category_id":"1265ecbe-6675-449c-9b70-28d1695ab887","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"},{"idx":30,"id":"fba4f0f2-5135-4e4e-a6e9-27808466aca9","name":"Latte Macchiato","description":"Price range: 215 (Reg) / 235 (Lrg)","price":"215.00","image_url":null,"category_id":"d5897645-e7f7-4f2c-a003-7d6b10cb0115","is_daily":false,"is_permanent":true,"is_out_of_stock":false,"created_at":"2025-12-25 10:47:33.492026+00"}];

async function seed() {
  console.log("Seeding Database...");

  // 1. Upsert Categories
  for (const cat of categories) {
    // Remove the idx property before inserting
    const { idx, ...record } = cat;
    
    // UPSERT category
    const { error } = await supabase.from('categories').upsert(record, { onConflict: 'id' });
    if (error) {
      console.error("Error upserting category:", error.message);
    }
  }
  console.log("✅ Categories upside completed");

  // 2. Upsert Menu Items with assigned image_urls
  for (const item of menuItems) {
    const { idx, ...record } = item;
    
    // Assign the category-specific image
    if (!record.image_url) {
      // @ts-ignore
       record.image_url = categoryImages[record.category_id] || null;
    }

    const { error } = await supabase.from('menu_items').upsert(record, { onConflict: 'id' });
    if (error) {
      console.error(`Error upserting item ${record.name}:`, error.message);
    }
  }
  console.log("✅ Menu Items upside completed with images");
}

seed().catch(console.error);
