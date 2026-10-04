/// <reference path="../pb_data/types.d.ts" />

// Products gain a flexible list of custom detail fields (e.g. Colours, Material)
// stored as [{ label, value }].
migrate((app) => {
  const collection = app.findCollectionByNameOrId('tbe_vendor_products')
  collection.fields.addAt(collection.fields.length, new Field({
    id: 'json3145027633',
    name: 'details_json',
    type: 'json',
    system: false,
    required: false,
    presentable: false,
    hidden: false,
    maxSize: 0,
  }))
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('tbe_vendor_products')
  collection.fields.removeById('json3145027633')
  return app.save(collection)
})
