/// <reference path="../pb_data/types.d.ts" />

// Taries Beauty Emporium — PocketBase schema
// Replaces the former Cloudflare D1 schema (cloudflare/schema.sql).
// All collections are server-side only (admin API); the Node service/Next
// app talks to PocketBase with a superuser token, enforcing app auth itself.

const t = (name, required = false) => ({ name, type: 'text', required })
const n = (name) => ({ name, type: 'number' })
const b = (name) => ({ name, type: 'bool' })
const j = (name) => ({ name, type: 'json' })

const COLLECTIONS = [
  {
    name: 'tbe_users',
    fields: [
      t('role', true), t('first_name', true), t('last_name', true), t('email', true),
      t('phone'), t('password_hash'), t('password_salt'), n('password_version'),
      t('avatar'), t('whatsapp'), t('created_at', true), t('updated_at', true), j('metadata_json'),
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_tbe_users_email` ON `tbe_users` (`email`)',
      'CREATE INDEX `idx_tbe_users_role` ON `tbe_users` (`role`)',
    ],
  },
  {
    name: 'tbe_user_addresses',
    fields: [
      t('user_id', true), t('label', true), t('first_name', true), t('last_name', true),
      t('address', true), t('city', true), t('country', true), t('phone', true),
      b('is_default'), t('created_at', true),
    ],
    indexes: ['CREATE INDEX `idx_tbe_user_addresses_user` ON `tbe_user_addresses` (`user_id`)'],
  },
  {
    name: 'tbe_sessions',
    fields: [
      t('user_id', true), t('token_hash', true), t('role', true), t('created_at', true),
      t('expires_at', true), t('last_seen_at', true), t('ip_address'), t('user_agent'),
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_tbe_sessions_token` ON `tbe_sessions` (`token_hash`)',
      'CREATE INDEX `idx_tbe_sessions_user` ON `tbe_sessions` (`user_id`)',
    ],
  },
  {
    name: 'tbe_vendors',
    fields: [
      t('user_id', true), t('brand_name'), t('business_name'), t('display_name'), t('bio'),
      t('status'), t('created_at', true), t('updated_at', true),
    ],
    indexes: ['CREATE UNIQUE INDEX `idx_tbe_vendors_user` ON `tbe_vendors` (`user_id`)'],
  },
  {
    name: 'tbe_vendor_products',
    fields: [
      t('vendor_id', true), t('slug', true), t('name', true), t('category', true),
      n('price'), n('original_price'), t('description', true), t('short_desc'),
      j('features_json'), j('variants_json'), j('images_json'), t('video'), t('badge'),
      t('whatsapp'), b('in_stock'), n('stock_count'), n('weight_kg'), b('sensitive'),
      t('model_3d'), b('active'), t('status'), t('added_at', true), t('updated_at', true), j('videos_json'),
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_tbe_vendor_products_slug` ON `tbe_vendor_products` (`slug`)',
      'CREATE INDEX `idx_tbe_vendor_products_vendor` ON `tbe_vendor_products` (`vendor_id`)',
      'CREATE INDEX `idx_tbe_vendor_products_status` ON `tbe_vendor_products` (`status`, `active`)',
    ],
  },
  {
    name: 'tbe_product_overrides',
    fields: [
      t('slug', true), t('name'), n('price'), n('original_price'), b('in_stock'), t('badge'),
      j('images_json'), t('description'), t('short_desc'), t('updated_at', true),
    ],
    indexes: ['CREATE UNIQUE INDEX `idx_tbe_product_overrides_slug` ON `tbe_product_overrides` (`slug`)'],
  },
  {
    name: 'tbe_orders',
    fields: [
      t('order_id', true), t('user_id'), t('date', true), t('status', true), t('payment_status', true),
      t('payment_method', true), t('currency', true), n('subtotal_usd'), n('shipping_usd'),
      n('grand_total_usd'), n('discount_usd'), t('coupon_code'), j('customer_json'), j('shipping_json'),
      t('notes'), t('gift_message'), t('created_at', true), t('updated_at', true),
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_tbe_orders_order_id` ON `tbe_orders` (`order_id`)',
      'CREATE INDEX `idx_tbe_orders_user` ON `tbe_orders` (`user_id`)',
      'CREATE INDEX `idx_tbe_orders_status` ON `tbe_orders` (`status`, `payment_status`)',
    ],
  },
  {
    name: 'tbe_order_items',
    fields: [
      t('order_id', true), t('product_id', true), t('product_name', true),
      n('unit_price_usd'), n('quantity'), j('selected_variants_json'), j('product_snapshot_json'),
      t('created_at', true),
    ],
    indexes: ['CREATE INDEX `idx_tbe_order_items_order` ON `tbe_order_items` (`order_id`)'],
  },
  {
    name: 'tbe_newsletter_subscribers',
    fields: [t('email', true), t('source'), t('created_at', true)],
    indexes: ['CREATE UNIQUE INDEX `idx_tbe_newsletter_email` ON `tbe_newsletter_subscribers` (`email`)'],
  },
  {
    name: 'tbe_stock_alert_requests',
    fields: [t('slug', true), t('email', true), t('created_at', true)],
    indexes: [
      'CREATE INDEX `idx_tbe_stock_alerts_slug` ON `tbe_stock_alert_requests` (`slug`)',
      'CREATE UNIQUE INDEX `idx_tbe_stock_alerts_slug_email` ON `tbe_stock_alert_requests` (`slug`, `email`)',
    ],
  },
  {
    name: 'tbe_media_assets',
    fields: [
      t('owner_user_id', true), t('kind', true), t('url', true), t('data_b64'),
      n('size_bytes'), t('mime', true), t('created_at', true),
    ],
    indexes: [
      'CREATE UNIQUE INDEX `idx_tbe_media_url` ON `tbe_media_assets` (`url`)',
      'CREATE INDEX `idx_tbe_media_owner` ON `tbe_media_assets` (`owner_user_id`, `created_at`)',
    ],
  },
  {
    name: 'tbe_store_settings',
    fields: [
      t('store_name', true), t('announcement'), t('whatsapp'), t('email'),
      b('maintenance_mode'), t('updated_at', true),
    ],
    indexes: [],
  },
  {
    name: 'tbe_chat_threads',
    fields: [
      t('user_id'), t('vendor_id'), t('subject'), t('status'), t('created_at', true), t('updated_at', true),
    ],
    indexes: [
      'CREATE INDEX `idx_tbe_chat_threads_user` ON `tbe_chat_threads` (`user_id`)',
      'CREATE INDEX `idx_tbe_chat_threads_vendor` ON `tbe_chat_threads` (`vendor_id`)',
    ],
  },
  {
    name: 'tbe_chat_messages',
    fields: [t('thread_id', true), t('sender_role', true), t('sender_id'), t('body', true), t('created_at', true)],
    indexes: ['CREATE INDEX `idx_tbe_chat_messages_thread` ON `tbe_chat_messages` (`thread_id`)'],
  },
  {
    name: 'tbe_presence_heartbeats',
    fields: [t('actor_id', true), t('actor_role', true), t('last_seen_at', true)],
    indexes: ['CREATE INDEX `idx_tbe_presence_actor` ON `tbe_presence_heartbeats` (`actor_id`)'],
  },
]

migrate((app) => {
  for (const def of COLLECTIONS) {
    const collection = new Collection({
      type: 'base',
      name: def.name,
      fields: def.fields,
      indexes: def.indexes,
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
    })
    app.save(collection)
  }

  // Seed the singleton store settings row (mirrors the former D1 seed).
  const settings = app.findCollectionByNameOrId('tbe_store_settings')
  const record = new Record(settings)
  record.set('store_name', 'Taries Beauty Emporium')
  record.set('announcement', 'Luxury wigs, bundles, beauty essentials and coats shipped from Guangzhou to Nigeria & Ghana.')
  record.set('whatsapp', '+234 903 541 2919')
  record.set('email', 'tariesbeautyemporium@gmail.com')
  record.set('maintenance_mode', false)
  record.set('updated_at', new Date().toISOString())
  app.save(record)
}, (app) => {
  for (const def of COLLECTIONS) {
    try {
      const collection = app.findCollectionByNameOrId(def.name)
      app.delete(collection)
    } catch (_) {
      // already removed
    }
  }
})
