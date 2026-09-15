const Button = ({ children, onClick }) => (
  <button onClick={onClick} style={{ background: '#2f6fed', color: 'white', border: 0, padding: '8px 14px' }}>
    {children}
  </button>
);

export default Button;
