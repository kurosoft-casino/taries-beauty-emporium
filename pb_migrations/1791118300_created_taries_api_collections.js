/// <reference path="../pb_data/types.d.ts" />

// Taries Beauty Emporium — collections referenced by the API but missing from
// the original D1 schema export: chat conversations/messages, wishlists,
// product reviews, stock movements and the audit log.

const t = (name, required = false) => ({ name, type: 'text', required })
const n = (name) => ({ name, type: 'number' })
const j = (name) => ({ name, type: 'json' })

const COLLECTIONS = [
  {
    name: 'tbe_stock_movements',
    fields: [t('product_id', true), n('delta'), t('reason'), t('ref_id'), t('created_at', true)],
    indexes: ['CREATE INDEX `idx_tbe_stock_movements_product` ON `tbe_stock_movements` (`product_id`)'],
  },
  {
    name: 'tbe_audit_log',
    fields: [
      t('user_id'), t('action', true), t('target_type'), t('target_id'), j('meta_json'),
      t('ip'), t('ua'), t('created_at', true),
    ],
    indexes: [
      'CREATE INDEX `idx_tbe_audit_user` ON `tbe_audit_log` (`user_id`)',
      'CREATE INDEX `idx_tbe_audit_created` ON `tbe_audit_log` (`created_at`)',
    ],
  },
  {
    name: 'tbe_conversations',
    fields: [
      t('kind'), t('customer_id', true), t('vendor_id'), t('admin_id'), t('subject'),
      t('last_message_at'), n('unread_customer'), n('unread_vendor'), n('unread_admin'),
      t('typing_user_id'), t('typing_until'), t('created_at', true),
    ],
    indexes: [
      'CREATE INDEX `idx_tbe_conversations_customer` ON `tbe_conversations` (`customer_id`)',
      'CREATE INDEX `idx_tbe_conversations_vendor` ON `tbe_conversations` (`vendor_id`)',
      'CREATE INDEX `idx_tbe_conversations_admin` ON `tbe_conversations` (`admin_id`)',
    ],
  },
  {
    name: 'tbe_messages',
    fields: [
      t('conversation_id', true), t('sender_id'), t('sender_role', true), t('kind'),
      t('body'), t('media_url'), j('media_meta_json'), t('original_lang'), j('translations_json'),
      t('read_at'), t('created_at', true),
    ],
    indexes: [
      'CREATE INDEX `idx_tbe_messages_conversation` ON `tbe_messages` (`conversation_id`, `created_at`)',
    ],
  },
  {
    name: 'tbe_wishlists',
    fields: [t('user_id', true), t('slug', true), t('created_at', true)],
    indexes: ['CREATE UNIQUE INDEX `idx_tbe_wishlists_user_slug` ON `tbe_wishlists` (`user_id`, `slug`)'],
  },
  {
    name: 'tbe_product_reviews',
    fields: [
      t('product_slug', true), t('user_id'), t('user_name'), n('rating'),
      t('title'), t('body', true), t('status'), t('created_at', true),
    ],
    indexes: [
      'CREATE INDEX `idx_tbe_reviews_slug_status` ON `tbe_product_reviews` (`product_slug`, `status`)',
      'CREATE INDEX `idx_tbe_reviews_created` ON `tbe_product_reviews` (`created_at`)',
    ],
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
