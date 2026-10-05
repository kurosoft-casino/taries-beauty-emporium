/// <reference path="../pb_data/types.d.ts" />

// Vendors gain a country field (Africa-wide marketplace support).
migrate((app) => {
  const collection = app.findCollectionByNameOrId('tbe_vendors')
  collection.fields.addAt(collection.fields.length, new Field({
    id: 'text6348201947',
    name: 'country',
    type: 'text',
    system: false,
    required: false,
    presentable: false,
    hidden: false,
    max: 0,
    min: 0,
    pattern: '',
    autogeneratePattern: '',
  }))
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('tbe_vendors')
  collection.fields.removeById('text6348201947')
  return app.save(collection)
})
