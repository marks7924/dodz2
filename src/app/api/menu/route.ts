import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const categories = await db.getCategories();
    const products = await db.getProducts();

    return NextResponse.json({
      success: true,
      categories,
      products,
    });
  } catch (err: any) {
    console.error('Failed to load menu data via API:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
