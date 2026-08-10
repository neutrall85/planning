// Централизованные стили для замены inline-стилей
export const commonStyles = {
  flexRow: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
  flexCol: { display: 'flex', flexDirection: 'column' },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mb20: { marginBottom: 20 },
  mb24: { marginBottom: 24 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mr8: { marginRight: 8 },
  mr12: { marginRight: 12 },
  mr16: { marginRight: 16 },
  ml8: { marginLeft: 8 },
  ml12: { marginLeft: 12 },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  gap16: { gap: 16 },
  bold: { fontWeight: 'bold' },
  muted: { color: '#666' },
  danger: { color: '#d32f2f' },
  success: { color: '#388e3c' },
  warning: { color: '#f57c00' },
};

export const getFlexStyle = (align = 'center', justify = 'flex-start', gap = 8) => ({
  display: 'flex',
  alignItems: align,
  justifyContent: justify,
  gap,
});

export const getSpacingStyle = (margins = {}) => ({
  marginBottom: margins.bottom || 0,
  marginTop: margins.top || 0,
  marginRight: margins.right || 0,
  marginLeft: margins.left || 0,
});
