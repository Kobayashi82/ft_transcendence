import React from "react";
import { Link, LinkProps } from "react-router-dom";
import { TABS } from "./Dashboard"; // Importing from your Dashboard component

interface DashboardLinkProps extends Omit<LinkProps, "to"> {
  section?: keyof typeof TABS;
  children: React.ReactNode;
}

/**
 * A component for creating links to specific dashboard sections
 *
 * @example
 * // Link to dashboard settings
 * <DashboardLink section="SETTINGS">Go to Settings</DashboardLink>
 *
 * // Link to default dashboard (profile)
 * <DashboardLink>Go to Dashboard</DashboardLink>
 */
const DashboardLink: React.FC<DashboardLinkProps> = ({
  section,
  children,
  ...rest
}) => {
  // Determine the path based on the section
  const path = section ? `/dashboard/${TABS[section]}` : "/dashboard";

  return (
    <Link to={path} {...rest}>
      {children}
    </Link>
  );
};

export default DashboardLink;
