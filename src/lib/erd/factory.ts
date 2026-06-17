import type { Column, Diagram, Table, Relationship } from "./types";
import { TABLE_COLORS } from "./types";

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newColumn(partial: Partial<Column> = {}): Column {
  return {
    id: uid("col"),
    name: partial.name ?? "column",
    type: partial.type ?? "varchar",
    isPrimary: partial.isPrimary ?? false,
    isNullable: partial.isNullable ?? true,
    isUnique: partial.isUnique ?? false,
    defaultValue: partial.defaultValue,
  };
}

export function newTable(partial: Partial<Table> = {}, index = 0): Table {
  return {
    id: uid("tbl"),
    name: partial.name ?? "new_table",
    x: partial.x ?? 120 + index * 40,
    y: partial.y ?? 120 + index * 40,
    color: partial.color ?? TABLE_COLORS[index % TABLE_COLORS.length],
    columns: partial.columns ?? [
      newColumn({ name: "id", type: "uuid", isPrimary: true, isNullable: false }),
    ],
  };
}

export function sampleDiagram(): Diagram {
  const usersId = "tbl_users";
  const postsId = "tbl_posts";
  const commentsId = "tbl_comments";

  const usersIdCol = "col_users_id";
  const postsIdCol = "col_posts_id";
  const postsUserCol = "col_posts_user";
  const commentsPostCol = "col_comments_post";
  const commentsUserCol = "col_comments_user";

  const tables: Table[] = [
    {
      id: usersId,
      name: "users",
      x: 80,
      y: 120,
      color: TABLE_COLORS[0],
      columns: [
        { id: usersIdCol, name: "id", type: "uuid", isPrimary: true, isNullable: false, isUnique: true },
        { id: "col_users_email", name: "email", type: "varchar", isPrimary: false, isNullable: false, isUnique: true },
        { id: "col_users_name", name: "full_name", type: "varchar", isPrimary: false, isNullable: true, isUnique: false },
        { id: "col_users_created", name: "created_at", type: "timestamp", isPrimary: false, isNullable: false, isUnique: false, defaultValue: "now()" },
      ],
    },
    {
      id: postsId,
      name: "posts",
      x: 480,
      y: 80,
      color: TABLE_COLORS[1],
      columns: [
        { id: postsIdCol, name: "id", type: "uuid", isPrimary: true, isNullable: false, isUnique: true },
        { id: postsUserCol, name: "user_id", type: "uuid", isPrimary: false, isNullable: false, isUnique: false },
        { id: "col_posts_title", name: "title", type: "varchar", isPrimary: false, isNullable: false, isUnique: false },
        { id: "col_posts_body", name: "body", type: "text", isPrimary: false, isNullable: true, isUnique: false },
        { id: "col_posts_pub", name: "published", type: "boolean", isPrimary: false, isNullable: false, isUnique: false, defaultValue: "false" },
      ],
    },
    {
      id: commentsId,
      name: "comments",
      x: 480,
      y: 400,
      color: TABLE_COLORS[2],
      columns: [
        { id: "col_comments_id", name: "id", type: "uuid", isPrimary: true, isNullable: false, isUnique: true },
        { id: commentsPostCol, name: "post_id", type: "uuid", isPrimary: false, isNullable: false, isUnique: false },
        { id: commentsUserCol, name: "user_id", type: "uuid", isPrimary: false, isNullable: false, isUnique: false },
        { id: "col_comments_body", name: "body", type: "text", isPrimary: false, isNullable: false, isUnique: false },
      ],
    },
  ];

  const relationships: Relationship[] = [
    { id: "rel_1", sourceTableId: postsId, sourceColumnId: postsUserCol, targetTableId: usersId, targetColumnId: usersIdCol, kind: "1-n" },
    { id: "rel_2", sourceTableId: commentsId, sourceColumnId: commentsPostCol, targetTableId: postsId, targetColumnId: postsIdCol, kind: "1-n" },
    { id: "rel_3", sourceTableId: commentsId, sourceColumnId: commentsUserCol, targetTableId: usersId, targetColumnId: usersIdCol, kind: "1-n" },
  ];

  return {
    id: "diagram_sample",
    name: "Blog Schema",
    dialect: "postgres",
    tables,
    relationships,
  };
}

export function emptyDiagram(): Diagram {
  return {
    id: uid("diagram"),
    name: "Untitled Schema",
    dialect: "postgres",
    tables: [],
    relationships: [],
  };
}
