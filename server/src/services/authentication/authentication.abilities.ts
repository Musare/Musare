import { Ability, AbilityBuilder, createAliasResolver } from "@casl/ability";
import { User } from "../../client";
import { Role } from "../users/users.schema";

// don't forget this, as `read` is used internally
const resolveAction = createAliasResolver({
  update: "patch", // define the same rules for update & patch
  read: ["get", "find"], // use 'read' as a equivalent for 'get' & 'find'
  delete: "remove" // use 'delete' or 'remove'
});

export const defineRulesFor = (user: User) => {
  // also see https://casl.js.org/v6/en/guide/define-rules
  const { can, cannot, rules } = new AbilityBuilder(Ability);

  if (user.role === Role.ADMIN) {
    can("manage", "all");
    return rules;
  }

  if (user.role === Role.MODERATOR) {
    can("view", "admin");
  }

  can("read", "users");
  can("update", "users", { id: user.id });
  cannot("update", "users", ["roleId"], { id: user.id });
  cannot("delete", "users", { id: user.id });

  can("manage", "tasks", { userId: user.id });
  can("create-multi", "posts", { userId: user.id });

  return rules;
};

export const defineAbilitiesFor = (user: User) => {
  const rules = defineRulesFor(user);

  return new Ability(rules, { resolveAction });
};