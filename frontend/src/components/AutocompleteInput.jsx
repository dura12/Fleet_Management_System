export default function AutocompleteInput({
  value,
  onChange,
  suggestions = [],
  listId,
  required,
  placeholder,
  multiline = false,
  ...rest
}) {
  const Input = multiline ? 'textarea' : 'input';
  return (
    <>
      <Input
        value={value}
        onChange={onChange}
        list={listId}
        required={required}
        placeholder={placeholder}
        {...rest}
      />
      <datalist id={listId}>
        {suggestions.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
    </>
  );
}
