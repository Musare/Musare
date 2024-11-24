import { defineStore } from 'pinia'
import { Ability, createAliasResolver, createMongoAbility } from '@casl/ability';
import { ref, watch } from 'vue';

export const useCaslStore = defineStore('casl', () => {
  const resolveAction = createAliasResolver({
    update: 'patch',       // define the same rules for update & patch
    read: ['get', 'find'], // use 'read' as a equivalent for 'get' & 'find'
    delete: 'remove'       // use 'delete' or 'remove'
  });
  const detectSubjectType = (subject: any) => {
    if (typeof subject === 'string') return subject;
    return subject.constructor.servicePath;
  }

  const ability = ref(
    createMongoAbility([], {
      detectSubjectType,
      resolveAction
    })
  );
  const rules = ref([]);

  watch(rules, value => {
    ability.value.update(value);
  });

  return {
    ability,
    rules
  };
});