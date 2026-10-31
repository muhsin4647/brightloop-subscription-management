import { Router, Response } from 'express';
import { db } from '../db/connection.ts';
import { requireAuth, requireStaffOrAdmin, requireAdmin, AuthenticatedRequest } from '../middleware/auth.ts';
import { logAudit } from '../services/auditService.ts';

const router = Router();

// GET /api/v1/products (all active or include archived)
router.get('/', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const where = includeArchived ? '1=1' : "status = 'active'";

    const products = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM product_variants v WHERE v.product_id = p.id AND v.is_active = 1) as variants_count,
        (SELECT COUNT(*) FROM subscription_plans sp WHERE sp.product_id = p.id AND sp.status = 'active') as active_plans_count
      FROM products p
      WHERE ${where}
      ORDER BY p.name ASC
    `).all();

    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/products/:id (with variants)
router.get('/:id', requireAuth, requireStaffOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY price_adjustment ASC').all(req.params.id);
    const plans = db.prepare('SELECT * FROM subscription_plans WHERE product_id = ?').all(req.params.id);

    res.json({ product, variants, plans });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/products (admin only)
router.post('/', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code, description, product_type, base_price, cost_price, currency, notes, variants } = req.body;
    if (!name || !code || base_price === undefined) {
      return res.status(400).json({ error: 'Product name, code (SKU), and base price are required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = db.prepare('SELECT id FROM products WHERE code = ?').get(cleanCode);
    if (existing) {
      return res.status(409).json({ error: 'Product SKU code already in use.' });
    }

    const productId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const createTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO products (id, name, code, description, product_type, base_price, cost_price, currency, notes, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
      `).run(
        productId,
        name.trim(),
        cleanCode,
        description?.trim() || '',
        product_type || 'software',
        Math.max(0, parseFloat(base_price)),
        Math.max(0, parseFloat(cost_price || 0)),
        currency || 'INR',
        notes?.trim() || null,
        req.user!.id,
        now,
        now
      );

      // Insert any initial variants provided
      if (Array.isArray(variants)) {
        const insertVar = db.prepare(`
          INSERT INTO product_variants (id, product_id, attribute_name, option_name, price_adjustment, is_active, created_at)
          VALUES (?, ?, ?, ?, ?, 1, ?)
        `);

        for (const v of variants) {
          if (v.attribute_name && v.option_name) {
            insertVar.run(
              `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              productId,
              v.attribute_name.trim(),
              v.option_name.trim(),
              parseFloat(v.price_adjustment || 0),
              now
            );
          }
        }
      }

      logAudit(req.user!.id, req.user!.email, 'PRODUCT_CREATED', 'PRODUCT', productId, `Created product ${name} (${cleanCode}).`);
    });

    createTx();
    res.status(201).json({ id: productId, message: 'Product created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/products/:id (admin only)
router.patch('/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const { name, description, product_type, base_price, cost_price, status, notes } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE products
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          product_type = COALESCE(?, product_type),
          base_price = COALESCE(?, base_price),
          cost_price = COALESCE(?, cost_price),
          status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          updated_at = ?
      WHERE id = ?
    `).run(
      name?.trim(),
      description?.trim(),
      product_type,
      base_price !== undefined ? parseFloat(base_price) : null,
      cost_price !== undefined ? parseFloat(cost_price) : null,
      status,
      notes?.trim(),
      now,
      req.params.id
    );

    logAudit(req.user!.id, req.user!.email, 'PRODUCT_UPDATED', 'PRODUCT', req.params.id, `Updated product details for ${product.name}.`);
    res.json({ message: 'Product updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/products/:id/variants (admin only)
router.post('/:id/variants', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const { attribute_name, option_name, price_adjustment } = req.body;
    if (!attribute_name || !option_name) {
      return res.status(400).json({ error: 'Attribute name (e.g. Brand) and Option name (e.g. Standard, Odoo) are required.' });
    }

    const varId = `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO product_variants (id, product_id, attribute_name, option_name, price_adjustment, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(
      varId,
      req.params.id,
      attribute_name.trim(),
      option_name.trim(),
      parseFloat(price_adjustment || 0),
      now
    );

    logAudit(req.user!.id, req.user!.email, 'VARIANT_CREATED', 'VARIANT', varId, `Added variant ${option_name} to product.`);
    res.status(201).json({ id: varId, message: 'Product variant created.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/products/variants/:variantId (admin only)
router.patch('/variants/:variantId', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { option_name, price_adjustment, is_active } = req.body;
    db.prepare(`
      UPDATE product_variants
      SET option_name = COALESCE(?, option_name),
          price_adjustment = COALESCE(?, price_adjustment),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      option_name?.trim(),
      price_adjustment !== undefined ? parseFloat(price_adjustment) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      req.params.variantId
    );

    res.json({ message: 'Variant updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
