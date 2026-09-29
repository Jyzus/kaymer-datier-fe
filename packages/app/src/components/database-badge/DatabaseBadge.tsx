import { DatabaseVendor } from '@/utils/api';
import { getVendorMeta } from '@/utils/databaseVendor';

import * as styles from './DatabaseBadge.styles';

interface DatabaseBadgeProps {
  vendor: DatabaseVendor | null | undefined;
  size?: number;
}

/** A small colored monogram identifying a schema's database engine. */
const DatabaseBadge: React.FC<DatabaseBadgeProps> = ({ vendor, size = 18 }) => {
  const meta = getVendorMeta(vendor);
  return (
    <span
      css={styles.badge(meta.color, size)}
      title={meta.label}
      aria-label={meta.label}
    >
      {meta.monogram}
    </span>
  );
};

export default DatabaseBadge;
