update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/pjpeg',
  'image/png',
  'image/x-png',
  'image/webp',
  'image/gif',
  'image/avif'
]
where id = 'service-images';
