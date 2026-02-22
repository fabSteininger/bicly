migrate((txApp) => {
  const findCollection = (nameOrId) => {
    try {
      return txApp.findCollectionByNameOrId(nameOrId);
    } catch (_) {
      return null;
    }
  };

  const ensureField = (collection, field) => {
    if (!collection.fields.getByName(field.name)) {
      collection.fields.add(field);
    }
  };

  const users = findCollection("users");
  if (users) {
    ensureField(users, new RelationField({
      id: "friends",
      name: "friends",
      required: false,
      collectionId: users.id,
      cascadeDelete: false,
      minSelect: 0,
      maxSelect: 0,
    }));
    ensureField(users, new BoolField({
      id: "admin_can_publish_profiles",
      name: "admin_can_publish_profiles",
      required: false,
    }));
    txApp.save(users);
  }

  if (!findCollection("route_files")) {
    const routeFiles = new Collection({
      id: "route_files",
      name: "route_files",
      type: "base",
      listRule: "@request.auth.id != '' && owner = @request.auth.id",
      viewRule: "@request.auth.id != '' && owner = @request.auth.id",
      createRule: "@request.auth.id != '' && owner = @request.auth.id",
      updateRule: "@request.auth.id != '' && owner = @request.auth.id",
      deleteRule: "@request.auth.id != '' && owner = @request.auth.id",
    });
    routeFiles.fields.add(new TextField({ name: "title", required: true, min: 3, max: 160 }));
    routeFiles.fields.add(new RelationField({
      name: "owner",
      required: true,
      collectionId: users ? users.id : "_pb_users_auth_",
      cascadeDelete: true,
      minSelect: 1,
      maxSelect: 1,
    }));
    routeFiles.fields.add(new FileField({
      name: "route_gpx",
      required: true,
      maxSelect: 1,
      mimeTypes: ["application/gpx+xml", "application/xml", "text/xml"],
    }));
    routeFiles.fields.add(new BoolField({ name: "is_shared_to_all_friends", required: false }));
    txApp.save(routeFiles);
  }

  if (!findCollection("file_shares")) {
    const fileShares = new Collection({
      id: "file_shares",
      name: "file_shares",
      type: "base",
      listRule: "@request.auth.id != '' && (shared_with = @request.auth.id || shared_by = @request.auth.id)",
      viewRule: "@request.auth.id != '' && (shared_with = @request.auth.id || shared_by = @request.auth.id)",
      createRule: "@request.auth.id != '' && shared_by = @request.auth.id",
      updateRule: "@request.auth.id != '' && shared_by = @request.auth.id",
      deleteRule: "@request.auth.id != '' && shared_by = @request.auth.id",
    });
    fileShares.fields.add(new RelationField({
      name: "route_file",
      required: true,
      collectionId: "route_files",
      cascadeDelete: true,
      minSelect: 1,
      maxSelect: 1,
    }));
    fileShares.fields.add(new RelationField({
      name: "shared_by",
      required: true,
      collectionId: users ? users.id : "_pb_users_auth_",
      cascadeDelete: true,
      minSelect: 1,
      maxSelect: 1,
    }));
    fileShares.fields.add(new RelationField({
      name: "shared_with",
      required: true,
      collectionId: users ? users.id : "_pb_users_auth_",
      cascadeDelete: true,
      minSelect: 1,
      maxSelect: 1,
    }));
    txApp.save(fileShares);
  }

  if (!findCollection("routing_profiles")) {
    const routingProfiles = new Collection({
      id: "routing_profiles",
      name: "routing_profiles",
      type: "base",
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.admin_can_publish_profiles = true",
      updateRule: "@request.auth.id != '' && @request.auth.admin_can_publish_profiles = true",
      deleteRule: "@request.auth.id != '' && @request.auth.admin_can_publish_profiles = true",
    });
    routingProfiles.fields.add(new TextField({ name: "name", required: true, min: 2, max: 80 }));
    routingProfiles.fields.add(new TextField({ name: "slug", required: true, min: 2, max: 80, pattern: "^[a-z0-9\\-]+$" }));
    routingProfiles.fields.add(new EditorField({ name: "description", required: false }));
    routingProfiles.fields.add(new TextField({ name: "brouter_profile_id", required: true, min: 2, max: 120 }));
    routingProfiles.fields.add(new RelationField({
      name: "created_by",
      required: true,
      collectionId: users ? users.id : "_pb_users_auth_",
      cascadeDelete: false,
      minSelect: 1,
      maxSelect: 1,
    }));
    txApp.save(routingProfiles);
  }
}, (txApp) => {
  const deleteCollection = (nameOrId) => {
    try {
      txApp.delete(txApp.findCollectionByNameOrId(nameOrId));
    } catch (_) {}
  };

  deleteCollection("routing_profiles");
  deleteCollection("file_shares");
  deleteCollection("route_files");

  try {
    const users = txApp.findCollectionByNameOrId("users");
    users.fields.removeByName("friends");
    users.fields.removeByName("admin_can_publish_profiles");
    txApp.save(users);
  } catch (_) {}
});
