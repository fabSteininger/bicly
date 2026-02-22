migrate((db) => {
  const users = new Collection({
    id: "_pb_users_auth_",
    name: "users",
    type: "auth",
    system: false,
    schema: [
      {
        system: false,
        id: "friends",
        name: "friends",
        type: "relation",
        required: false,
        presentable: false,
        unique: false,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: false,
          minSelect: null,
          maxSelect: null,
          displayFields: ["name", "email"],
        },
      },
      {
        system: false,
        id: "admin_can_publish_profiles",
        name: "admin_can_publish_profiles",
        type: "bool",
        required: false,
        presentable: false,
        unique: false,
        options: {},
      },
    ],
  });
  db.collection(users.name).save(users);

  const routeFiles = new Collection({
    id: "route_files",
    name: "route_files",
    type: "base",
    system: false,
    schema: [
      { name: "title", type: "text", required: true, options: { min: 3, max: 160 } },
      {
        name: "owner",
        type: "relation",
        required: true,
        options: { collectionId: "_pb_users_auth_", cascadeDelete: true, maxSelect: 1 },
      },
      { name: "route_gpx", type: "file", required: true, options: { maxSelect: 1, mimeTypes: ["application/gpx+xml", "application/xml", "text/xml"] } },
      { name: "is_shared_to_all_friends", type: "bool", required: false, options: {} },
    ],
    listRule: "@request.auth.id != '' && (owner = @request.auth.id || id ?= @collection.file_shares.route_file)",
    viewRule: "@request.auth.id != '' && (owner = @request.auth.id || id ?= @collection.file_shares.route_file)",
    createRule: "@request.auth.id != '' && owner = @request.auth.id",
    updateRule: "@request.auth.id != '' && owner = @request.auth.id",
    deleteRule: "@request.auth.id != '' && owner = @request.auth.id",
  });
  db.collection(routeFiles.name).save(routeFiles);

  const fileShares = new Collection({
    id: "file_shares",
    name: "file_shares",
    type: "base",
    system: false,
    schema: [
      { name: "route_file", type: "relation", required: true, options: { collectionId: "route_files", cascadeDelete: true, maxSelect: 1 } },
      { name: "shared_by", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", cascadeDelete: true, maxSelect: 1 } },
      { name: "shared_with", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", cascadeDelete: true, maxSelect: 1 } },
    ],
    listRule: "@request.auth.id != '' && (shared_with = @request.auth.id || shared_by = @request.auth.id)",
    viewRule: "@request.auth.id != '' && (shared_with = @request.auth.id || shared_by = @request.auth.id)",
    createRule: "@request.auth.id != '' && shared_by = @request.auth.id",
    updateRule: "@request.auth.id != '' && shared_by = @request.auth.id",
    deleteRule: "@request.auth.id != '' && shared_by = @request.auth.id",
  });
  db.collection(fileShares.name).save(fileShares);

  const routingProfiles = new Collection({
    id: "routing_profiles",
    name: "routing_profiles",
    type: "base",
    system: false,
    schema: [
      { name: "name", type: "text", required: true, options: { min: 2, max: 80 } },
      { name: "slug", type: "text", required: true, options: { min: 2, max: 80, pattern: "^[a-z0-9\\-]+$" } },
      { name: "description", type: "editor", required: false, options: {} },
      { name: "brouter_profile_id", type: "text", required: true, options: { min: 2, max: 120 } },
      { name: "created_by", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", cascadeDelete: false, maxSelect: 1 } },
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != '' && @request.auth.admin_can_publish_profiles = true",
    updateRule: "@request.auth.id != '' && @request.auth.admin_can_publish_profiles = true",
    deleteRule: "@request.auth.id != '' && @request.auth.admin_can_publish_profiles = true",
  });
  db.collection(routingProfiles.name).save(routingProfiles);
}, (db) => {
  db.collection("routing_profiles").drop();
  db.collection("file_shares").drop();
  db.collection("route_files").drop();
});
