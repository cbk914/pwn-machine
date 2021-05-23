import Vue from "vue";
import _ from "lodash";

function isDeepForm(obj) {
  if (obj === null) {
    return false;
  }
  if (typeof obj !== "object") {
    return false;
  }
  return "formDefinition" in obj;
}

export function mapGetter(...names) {
  const getters = {};
  for (const name of names) {
    const parts = name.split(".");
    const fullName = name.replace(/\./g, "_");
    getters[fullName] = function() {
      return parts.reduce(
        (target, part) => target && target[part],
        this.form ?? {}
      );
    };
  }
  return getters;
}

function instanciateComponent(comp, props = {}) {
  const ComponentClass = Vue.extend(comp);
  const instance = new ComponentClass({
    propsData: props
  });
  instance.$mount();
  return instance;
}

function isBasicType(obj) {
  return obj === null || ["number", "string", "boolean"].includes(typeof obj);
}

export default {
  props: {
    value: { default: null }
  },
  isDeepForm: true,
  data() {
    return {
      form: {},
      originalForm: {},
      formChildren: {},
      internalEdit: false
    };
  },
  created() {
    this.buildOriginalForm();
    this.reset();
  },
  methods: {
    renderForm(f) {
      return f;
    },
    reset() {
      this.form = _.cloneDeep(this.originalForm);
    },
    submit() {
      this.$emit("submit", this.form);
    },
    instanciateSubForm(sub, value) {
      return instanciateComponent(sub, { value });
    },
    buildOriginalForm() {
      const definition = this.$options.formDefinition;

      if (isBasicType(definition)) {
        this.originalForm = this.value ?? definition;
      } else if (Array.isArray(definition)) {
        this.originalForm = this.value ? [...this.value] : [...definition];
      } else {
        const originalForm = {};
        for (let [name, defaultValue] of Object.entries(definition)) {
          if (typeof defaultValue == "function") {
            defaultValue = defaultValue(this.value);
          }
          if (isDeepForm(defaultValue)) {
            this.formChildren[name] = defaultValue;
            originalForm[name] = this.instanciateSubForm(
              defaultValue,
              this.value?.[name]
            ).originalForm;
          } else {
            originalForm[name] = this.value?.[name] ?? defaultValue;
          }
        }
        this.originalForm = originalForm;
      }
    }
  },
  computed: {
    modified() {
      return !_.isEqual(this.form, this.originalForm);
    }
  },
  watch: {
    value() {
      if (!this.internalEdit) {
        this.buildOriginalForm();
        this.reset();
      }
    },
    form: {
      deep: true,
      async handler() {
        this.internalEdit = true;
        await this.$emit("input", this.renderForm(this.form));
        this.internalEdit = false;
      }
    }
  }
};
