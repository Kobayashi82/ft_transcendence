import { useState, useCallback, ChangeEvent } from 'react';

type FormErrors<T> = Partial<Record<keyof T, string>>;
type ValidationRules<T> = Partial<Record<keyof T, (value: any) => string | undefined>>;
type FormTouched<T> = Partial<Record<keyof T, boolean>>;

interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => void | Promise<void>;
  validate?: ValidationRules<T>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

interface UseFormResult<T> {
  values: T;
  errors: FormErrors<T>;
  touched: FormTouched<T>;
  isSubmitting: boolean;
  isDirty: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleBlur: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  setFieldValue: (name: keyof T, value: any) => void;
  setFieldError: (name: keyof T, error: string) => void;
  setFieldTouched: (name: keyof T, isTouched: boolean) => void;
  resetForm: () => void;
  submitForm: () => Promise<void>;
  isValid: boolean;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  onSubmit,
  validate = {},
  validateOnChange = true,
  validateOnBlur = true,
}: UseFormOptions<T>): UseFormResult<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<FormTouched<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialState] = useState(initialValues);
  const [isDirty, setIsDirty] = useState(false);

  // Check if form is valid (no errors)
  const isValid = Object.keys(errors).length === 0;

  // Validate all fields
  const validateAll = useCallback(() => {
    const newErrors: FormErrors<T> = {};
    let hasErrors = false;

    Object.keys(validate).forEach((key) => {
      const validateField = validate[key as keyof T];
      if (validateField) {
        const error = validateField(values[key as keyof T]);
        if (error) {
          hasErrors = true;
          newErrors[key as keyof T] = error;
        }
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  }, [validate, values]);

  // Validate a single field
  const validateField = useCallback(
    (name: keyof T) => {
      const validateFieldFn = validate[name];
      if (!validateFieldFn) return;

      const error = validateFieldFn(values[name]);
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    },
    [validate, values]
  );

  // Handle input change
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      let parsedValue: any = value;

      // Handle different input types
      if (type === 'checkbox' && 'checked' in e.target) {
        parsedValue = e.target.checked;
      } else if (type === 'number') {
        parsedValue = value === '' ? '' : Number(value);
      }

      setValues((prev) => {
        const newValues = { ...prev, [name]: parsedValue };
        setIsDirty(JSON.stringify(newValues) !== JSON.stringify(initialState));
        return newValues;
      });

      if (validateOnChange) {
        const validateFieldFn = validate[name as keyof T];
        if (validateFieldFn) {
          const error = validateFieldFn(parsedValue);
          setErrors((prev) => ({
            ...prev,
            [name]: error,
          }));
        }
      }
    },
    [validate, validateOnChange, initialState]
  );

  // Handle input blur
  const handleBlur = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name } = e.target;
      
      setTouched((prev) => ({
        ...prev,
        [name]: true,
      }));

      if (validateOnBlur) {
        validateField(name as keyof T);
      }
    },
    [validateField, validateOnBlur]
  );

  // Set field value programmatically
  const setFieldValue = useCallback(
    (name: keyof T, value: any) => {
      setValues((prev) => {
        const newValues = { ...prev, [name]: value };
        setIsDirty(JSON.stringify(newValues) !== JSON.stringify(initialState));
        return newValues;
      });

      if (validateOnChange) {
        validateField(name);
      }
    },
    [validateField, validateOnChange, initialState]
  );

  // Set field error programmatically
  const setFieldError = useCallback((name: keyof T, error: string) => {
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  }, []);

  // Set field touched programmatically
  const setFieldTouched = useCallback((name: keyof T, isTouched: boolean) => {
    setTouched((prev) => ({
      ...prev,
      [name]: isTouched,
    }));
  }, []);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setIsDirty(false);
  }, [initialValues]);

  // Submit form
  const submitForm = useCallback(async () => {
    setIsSubmitting(true);
    
    try {
      // Validate all fields
      const isFormValid = validateAll();
      
      if (isFormValid) {
        await onSubmit(values);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, validateAll, values]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    resetForm,
    submitForm,
    isValid,
  };
}

export default useForm;