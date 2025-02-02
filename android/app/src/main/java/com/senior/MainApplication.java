@Override
    protected List<ReactPackage> getPackages() {
      List<ReactPackage> packages = new PackageList(this).getPackages();
      packages.add(new AndroidSmsPackage()); // Add this line
      return packages;
    }