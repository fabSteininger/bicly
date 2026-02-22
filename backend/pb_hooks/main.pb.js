/// <reference path="../pb_data/types.d.ts" />

routerAdd("GET", "/api/brouter/route", (c) => {
  const profile = c.request.url.query().get("profile") ?? "trekking";
  const points = c.request.url.query().get("points");

  if (!points) {
    throw new BadRequestError("points query parameter is required");
  }

  const response = $http.send({
    url: `http://brouter:17777/brouter?lonlats=${encodeURIComponent(points)}&profile=${encodeURIComponent(profile)}&format=gpx`,
    method: "GET",
    timeout: 120,
  });

  c.response.header().set("Content-Type", "application/gpx+xml; charset=utf-8");
  return c.blob(200, "application/gpx+xml", response.raw);
}, $apis.requireAuth());

routerAdd("POST", "/api/route-files/:id/share-friends", (c) => {
  const auth = c.get("authRecord");
  const fileId = c.pathParam("id");
  const friendIds = toString(c.requestInfo().body["friendIds"] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => !!value);

  const routeFile = $app.findRecordById("route_files", fileId);

  if (routeFile.get("owner") !== auth.id) {
    throw new ForbiddenError("You can only share your own files");
  }

  const ownerFriends = routeFile.expand()?.owner?.friends ?? auth.get("friends") ?? [];

  for (const friendId of friendIds) {
    if (!ownerFriends.includes(friendId)) {
      continue;
    }

    const existing = $app.findFirstRecordByData("file_shares", "route_file", routeFile.id, "shared_with", friendId);
    if (existing) {
      continue;
    }

    const share = new Record($app.findCollectionByNameOrId("file_shares"));
    share.set("route_file", routeFile.id);
    share.set("shared_by", auth.id);
    share.set("shared_with", friendId);
    $app.save(share);
  }

  return c.json(200, { status: "ok" });
}, $apis.requireAuth());
