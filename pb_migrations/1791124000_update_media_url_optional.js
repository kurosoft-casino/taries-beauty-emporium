/// <reference path="../pb_data/types.d.ts" />

// Media records are created first and then stamped with their canonical
// `/api/media/<id>` URL, so `url` cannot be required at create time.
migrate((app) => {
  const collection = app.findCollectionByNameOrId('tbe_media_assets')
  const field = collection.fields.getByName('url')
  if (field) field.required = false
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('tbe_media_assets')
  const field = collection.fields.getByName('url')
  if (field) field.required = true
  return app.save(collection)
})
