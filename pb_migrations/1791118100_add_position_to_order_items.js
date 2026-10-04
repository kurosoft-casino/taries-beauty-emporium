/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId('tbe_order_items')

  // add field
  collection.fields.addAt(collection.fields.length, new Field({
    id: 'number3185510291',
    name: 'position',
    type: 'number',
    system: false,
    required: false,
    presentable: false,
    hidden: false,
    min: null,
    max: null,
    onlyInt: false,
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('tbe_order_items')
  collection.fields.removeById('number3185510291')
  return app.save(collection)
})
