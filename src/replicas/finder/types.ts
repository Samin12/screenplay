// Data and state shapes for the finder replica. Everything is optional in edit.yaml.

export type FinderKind = 'folder' | 'image' | 'video' | 'audio' | 'doc' | 'code';

export type FinderItem = {
  id: string;
  name: string;
  kind?: FinderKind; // default: from the name ("x/" or no extension = folder, .png = image, .mp4 = video ...)
  thumb?: string; // work-dir media drawn as the icon (an image; a video path shows its frame at thumbAt seconds)
  thumbAt?: number; // seconds into a video thumb (default 0.5)
  meta?: string; // item info: blue line under the name (icon view), Size column (list view): "12 items", "3840 × 2160"
  date?: string; // list view "Date Modified" (default data.date)
  items?: FinderItem[]; // a folder's contents: shown when state.path is this id
};

export type FinderFolder = { title?: string; path?: string | string[]; items: FinderItem[] };

export type SidebarSection = { section: string; items: { name: string; icon?: string; active?: boolean }[] };

export type FinderData = {
  title: string; // folder name in the toolbar
  path?: string | string[] | null; // path bar at the bottom: "Macintosh HD/Users/you/Brand Kit" (null hides it)
  view: 'icon' | 'list';
  items: FinderItem[];
  folders?: Record<string, FinderFolder>; // other folders state.path can open (key = any name, usually a folder item's id)
  sidebar: SidebarSection[] | false;
  stamp?: string | null; // amber pill in the toolbar, e.g. "Recreated"
  columns?: number; // icon view columns (default: as many ~200 px cells as fit)
  date?: string; // default "Date Modified" text
  search?: boolean; // search field in the toolbar (default true)
};

export type FinderState = {
  view?: 'icon' | 'list' | null; // overrides data.view
  path?: string | null; // folder shown: a key of data.folders, or the id of a folder item that has `items` (null = the top folder)
  items?: FinderItem[] | null; // replaces the item list of the folder on screen
  shown?: string[] | null; // ids visible (null = all); ids added by a `set` pop in
  upto?: number | null; // or: only the first N items
  selected?: string[] | string | null;
  moved?: string[] | null; // ids moved out of this folder: icon view leaves their slots empty (nothing reflows), list view drops the rows
  newFolder?: boolean | { id?: string; name?: string } | null; // an extra folder at the end ("untitled folder", id "new"), name field open
  rename?: string | null; // text typed into the open name field (type with key: rename)
  renaming?: string | null; // id whose name field is open; unset = the new folder; null = committed (closed)
  names?: Record<string, string>; // permanent renames: {id: "new name"}
  drag?: null | { ids: string[]; count?: number }; // a drag in progress: a ghost stack of these items follows the cursor
  dropTarget?: string | null; // id of the folder (or "side-<slug>") highlighted as the drop target; automatic for the hovered folder while dragging
  scroll?: number; // px the content has scrolled (tween it)
};
