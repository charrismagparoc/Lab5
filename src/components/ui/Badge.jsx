export default function Badge({ label, type = 'neutral', icon, style }) {
  return (
    <span className={`badge bd-${type}`} style={style}>
      {icon && <i className={`fa-solid ${icon}`} style={{ fontSize: 9 }}></i>}
      {label}
    </span>
  )
}
